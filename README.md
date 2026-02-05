# 🧠 Synth Code

**Synth Code** est un outil NodeJS permettant de **générer automatiquement une documentation technique synthétique** à partir d’un ou plusieurs projets de code.  
Il analyse les fichiers source, les regroupe par **fichier** ou **dossier**, puis utilise un **modèle d’IA** pour produire une documentation claire, lisible et navigable.

La documentation générée est consultable via une **interface HTML autonome**, sans serveur.

---

## ✨ Fonctionnalités

- 🔍 Scan automatique de projets (multi-projets supportés)
- 📁 Regroupement par **fichier** ou par **répertoire**
- 🤖 Génération de synthèse via IA
- 🌍 Support multilingue (FR, EN, ES, DE)
- 📚 Interface HTML moderne avec :
  - navigation latérale
  - recherche plein texte
  - thème clair / sombre
- 🧩 Aucune dépendance backend pour consulter la documentation
- 📦 Utilisation simple via une archive ZIP

---

## 📦 Prérequis

- **NodeJS** (version 18+ recommandée)  
  https://nodejs.org
- **npm**
- Connexion internet (uniquement pour les modèles IA distants)

---

## 🚀 Installation rapide

### 1️⃣ Télécharger et extraire

1. Télécharger l’archive **`synth-code.zip`**
2. Extraire son contenu **à la racine du projet à documenter**

Structure attendue :

```
your-project/
├─ synth-code/
│ ├─ src/
│ ├─ ├─ generate.js
│ ├─ documentation.html
│ ├─ config.json
│ ├─ package.json
├─ ...
```

### 2️⃣ Installer les dépendances

```bash
cd synth-code
npm install
```

### 3️⃣ Configurer Synth Code

- Renommer `config.example.json` en `config.json`
- Modifier le fichier selon votre projet (voir section configuration)

### 4️⃣ Générer la documentation

```bash
npm run start
```

À la fin :
- un dossier docs/ est généré
- le fichier `documentation.html` peut être ouvert directement dans un navigateur

👉 Aucun serveur n’est nécessaire.

---

## ⚙️ Configuration

### Exemple minimal

```json
{
    "context": "",
    "language": "en-US",
    "model": {
        "mode": "remote",
        "path": ""
    },
    "projects": [
        {
            "name": "My Project",
            "path": "./../src",
            "strategy": "file",
            "excluded": []
        }
    ]
}
```

## 🧩 Paramètres de configuration

### 🔤 Langues supportées

| Code | Langue |
| ---- | ------ |
| fr-FR | Français |
| en-US | Anglais |
| es-ES | Espagnol |
| de-DE | Allemand |

### 🤖 Modèles IA disponibles (mode remote)

| Identifiant | Modèle |
| ----------- | ------ |
| qwen2.5-coder-3b | Qwen 2.5 Coder 3B (recommandé) |
| deepseek-coder-1.3b | DeepSeek Coder 1.3B |

### 🧠 Mode IA (model)

| Paramètre | Valeur | Description |
| --------- | ------ | ----------- |
| mode | remote | Télécharge le modèle depuis HuggingFace |
| mode | local | Utilise un modèle local |
| path | "" | Modèle distant par défaut |
| path | ./model | Chemin vers un modèle local |

### 📁 Stratégie de génération (strategy)

| Valeur | Comportement |
| ------ | ------------ |
| file | 1 module = 1 fichier |
| directory | 1 module = 1 dossier |

## 📂 Fichiers analysés

Extensions prises en charge :

`.js, .html, .css, .yml, .cs`

Dossiers exclus automatiquement :

`node_modules, .git, dist, build, .next, out`

## 🚫 Limitations

- Taille max analysée par fichier : 9999 caractères
- Analyse purement statique
- Pas de diagrammes UML
- La qualité dépend du code analysé et du modèle IA

## 📄 Licence

Ce projet est distribué sous licence MIT.

©Nolann Morencé – Tous droits réservés.
