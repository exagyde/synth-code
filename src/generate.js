// Copyright (c) Nolann Morencé. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import fs from "fs";
import path from "path";
import { pipeline, env } from "@huggingface/transformers";
import CONFIG from "./config.json" with { type: "json" };

/* =======================
   CONFIG STRICTE
======================= */

const EXCLUDED_DIR = ["node_modules", ".git", "dist", "build", ".next", "out"];
const INCLUDED_FILE = [".html", ".js", ".css", ".yml", ".cs"];
const MAX_FILE_CHARS = 9999;
const OUTPUT_DIR = "./docs";

const REMOTE_MODELS = {
    "qwen2.5-coder-3b": {
        name: "onnx-community/Qwen2.5-Coder-3B-Instruct",
        dtype: "q4"
    },
    "deepseek-coder-1.3b": {
        name: "onnx-community/DeepSeek-Coder-1.3B-Instruct",
        dtype: "q4"
    }
};

const MODEL_CONFIG = {
    mode: CONFIG.model.mode,
    remote: REMOTE_MODELS[CONFIG.model.path] ?? "qwen2.5-coder-3b",
    local: {
        path: CONFIG.model.path
    }
};

const getModelConfig = () => {
    if (MODEL_CONFIG.mode === "local") {
        env.allowRemoteModels = false;
        return MODEL_CONFIG.local.path;
    }

    env.allowRemoteModels = true;
    return MODEL_CONFIG.remote.name;
}

/* =======================
   SCAN PROJET
======================= */

function scan(dir, excluded, files = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory() && !EXCLUDED_DIR.includes(e.name)) {
            scan(path.join(dir, e.name), excluded, files);
        } else if (e.isFile() && INCLUDED_FILE.includes(path.extname(e.name)) && !excluded.includes(e.name)) {
            files.push(path.join(dir, e.name));
        }
    }
    return files;
}

/* =======================
   IA HELPERS
======================= */

function groupByDirectory(projectPath, files) {
    const groups = {};
    for (const file of files) {
        const dir = path.relative(projectPath, path.dirname(file)).replace(/^[\\/]/, "") || "/";
        if (!groups[dir]) groups[dir] = [];
        groups[dir].push(file);
    }
    return groups;
}

function groupByFile(files) {
    const groups = {};
    for (const file of files) {
        const name = path.basename(file);
        groups[name] = [file];
    }
    return groups;
}

function formatToJSON(formatJSON, language = "fr-FR") {
    const translation = DOC_I18N[language] ?? DOC_I18N["fr-FR"];
    return `## ${translation.component} ${formatJSON.MODULE}\n
### ${translation.role}\n\n${formatJSON.ROLE_DU_MODULE}\n
### ${translation.description}\n\n${formatJSON.DESCRIPTION}\n
### ${translation.interactions}\n
| ${translation.table.name} | ${translation.table.type} | ${translation.table.description} |
| --- | ---- | ----------- |
${formatJSON.INTERACTIONS_ET_REGLES.map(l => `| ${l.NOM} | ${l.TYPE} | ${l.DESCRIPTION} |`).join("\n")}`;
}

async function summarizeFolder(generator, folder, files, retry = 0) {
    if(retry == 3) {
        console.log(`[${new Date().toLocaleString()}] ❌ Generation échouée module : ${folder}`);
        return;
    }

    const contents = files.map(file => {
        try {
            const code = fs.readFileSync(file, "utf8").slice(0, MAX_FILE_CHARS);
            return `FICHIER: ${file}\n${code}`;
        } catch {
            return "";
        }
    }).join("\n\n---\n\n");

    const messages = [
        {
            role: "system",
            content: `Tu es un parseur syntaxique.
            Tu produis UNIQUEMENT du JSON valide.
            Si une information n'existe pas, retourne un tableau vide.
            N'utilise jamais de texte libre.
            Tu dois TERMINER ta réponse par </JSON>.
            Si tu n'as plus de tokens, ne commence PAS une nouvelle clé.
            TOUTES les valeurs textuelles doivent être rédigées dans la langue LANGUE.
            
            IL Y A TOUJOURS DU CODE A ANALYSER.
            TU DOIS UNIQUEMENT ÉCRIRE ENTRE <JSON> ET </JSON>.
            TOUT TEXTE EN DEHORS SERA IGNORÉ.`
        },
        {
            role: "user",
            content: `<JSON>
            {
                "LANGUE": ${CONFIG.language ?? "fr-FR"}
                "MODULE": "${folder}",
                "ROLE_DU_MODULE": "...",
                "DESCRIPTION": "...",
                "INTERACTIONS_ET_REGLES": [
                    {
                        "NOM": "...",
                        "TYPE": "...",
                        "DESCRIPTION": "..."
                    }, ...
                ]
            }
            </JSON>
            
            ${CONFIG.context ? `CONTEXTE DU PROJET : ${CONFIG.context}` : ""}

            SOURCE À ANALYSER (NE PAS REPRODUIRE) :
            ${contents}`
        }
    ];

    const out = await generator(messages, {
        max_new_tokens: 999,
        temperature: 0,
        do_sample: false
    });

    const match = out[0].generated_text.at(-1).content.match(/<JSON>([\s\S]*?)<\/JSON>/g);
    if(!match) summarizeFolder(generator, folder, files, retry+1);

    const formatDoc = out[0].generated_text.at(-1).content.replace(/<JSON>\n|\n<\/JSON>/g, "");
    const formatJSON = JSON.parse(formatDoc.replace(/\\/g, "/"));
    return formatToJSON(formatJSON);
}

/* ======================= MAIN ======================= */

const toSnakeCase = (str) => str.toLowerCase().trim().replace(/\s+/g, "_");

async function run() {
    console.log("🔧 Chargement du modèle...");
    const generator = await pipeline(
        "text-generation",
        getModelConfig(),
        MODEL_CONFIG.mode === "remote" ? { dtype: MODEL_CONFIG.remote.dtype } : {}
    );

    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
    if(fs.existsSync(`./${OUTPUT_DIR}/index.js`)) fs.rmSync(`./${OUTPUT_DIR}/index.js`);
    if(!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

    let index = {};
    for(const project of CONFIG.projects) {
        console.log(`🔍️ Scan du projet ${project.name}...`);
        const files = scan(project.path, project.excluded ?? []);
        console.log(`📄 ${files.length} fichiers détectés`);

        console.log(`👷 Création de la documentation...`);
        const projectName = toSnakeCase(project.name);
        if(!index[projectName]) index[projectName] = [];
        const grouped = project.strategy === "file" ? groupByFile(files) : groupByDirectory(project.path, files);

        for (const [folder, folderFiles] of Object.entries(grouped)) {
            console.log(`[${new Date().toLocaleString()}] 📦️ Analyse du module : ${folder}`);
            const folderPath = `${OUTPUT_DIR}/${projectName}/${folder}`;
            const doc = await summarizeFolder(generator, folder, folderFiles);
            fs.mkdirSync(folderPath, { recursive: true });
            fs.writeFileSync(`${folderPath}/README.md`, doc);
            index[projectName].push({ title: folder, path: `${folderPath}/README.md`, content: doc });
        }
    }

    fs.writeFileSync(`./${OUTPUT_DIR}/index.js`, `window.DOC_INDEX = ${JSON.stringify(index, null, 4)};`);
    console.log("✅ DOCUMENTATION.md générée");
}
run();

const DOC_I18N = {
    "fr-FR": {
        component: "Composant",
        role: "Rôle",
        description: "Description",
        interactions: "Interactions et règles",
        table: {
            name: "Nom",
            type: "Type",
            description: "Description"
        }
    },

    "en-US": {
        component: "Component",
        role: "Role",
        description: "Description",
        interactions: "Interactions and rules",
        table: {
            name: "Name",
            type: "Type",
            description: "Description"
        }
    },

    "es-ES": {
        component: "Componente",
        role: "Rol",
        description: "Descripción",
        interactions: "Interacciones y reglas",
        table: {
            name: "Nombre",
            type: "Tipo",
            description: "Descripción"
        }
    },

    "de-DE": {
        component: "Komponente",
        role: "Rolle",
        description: "Beschreibung",
        interactions: "Interaktionen und Regeln",
        table: {
            name: "Name",
            type: "Typ",
            description: "Beschreibung"
        }
    }
};