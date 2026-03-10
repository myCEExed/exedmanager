# Guide Complet de Migration et Auto-Hébergement
## EXED Manager 365

**Version**: 1.0  
**Date**: Janvier 2026  
**Niveau**: Débutant

---

## Table des matières

1. [Introduction](#1-introduction)
2. [Prérequis](#2-prérequis)
3. [Récupération du code source](#3-récupération-du-code-source)
4. [Configuration de l'environnement serveur](#4-configuration-de-lenvironnement-serveur)
5. [Installation de la base de données](#5-installation-de-la-base-de-données)
6. [Déploiement du frontend](#6-déploiement-du-frontend)
7. [Déploiement du backend (Edge Functions)](#7-déploiement-du-backend-edge-functions)
8. [Configuration du Chatbot IA](#8-configuration-du-chatbot-ia)
9. [Synchronisation avec Lovable](#9-synchronisation-avec-lovable)
10. [Maintenance et mises à jour](#10-maintenance-et-mises-à-jour)
11. [Dépannage](#11-dépannage)

---

## 1. Introduction

### Qu'est-ce que ce guide ?

Ce guide vous accompagne pas à pas dans la migration d'EXED Manager depuis Lovable vers vos propres serveurs. Il est conçu pour les personnes ayant peu d'expérience en programmation.

### Architecture de l'application

EXED Manager est composé de :
- **Frontend** : Application web React (ce que les utilisateurs voient)
- **Backend** : Base de données PostgreSQL + Edge Functions (logique serveur)
- **Stockage** : Fichiers et documents uploadés
- **Authentification** : Gestion des utilisateurs et connexions

---

## 2. Prérequis

### 2.1 Matériel requis

| Composant | Minimum | Recommandé |
|-----------|---------|------------|
| CPU | 2 cœurs | 4+ cœurs |
| RAM | 4 Go | 8+ Go |
| Stockage | 20 Go SSD | 100+ Go SSD |
| Bande passante | 100 Mbps | 1 Gbps |

### 2.2 Logiciels à installer sur votre serveur

Avant de commencer, vous devez installer ces logiciels sur votre serveur :

#### A. Node.js (version 18 ou supérieure)

**Sur Ubuntu/Debian :**
```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Vérifier l'installation
node --version  # Doit afficher v20.x.x
npm --version   # Doit afficher 10.x.x
```

**Sur Windows :**
1. Téléchargez Node.js depuis https://nodejs.org
2. Lancez l'installateur et suivez les instructions
3. Redémarrez votre ordinateur
4. Ouvrez PowerShell et tapez `node --version`

#### B. Git (pour récupérer le code)

**Sur Ubuntu/Debian :**
```bash
sudo apt install git -y
git --version
```

**Sur Windows :**
1. Téléchargez Git depuis https://git-scm.com/download/win
2. Installez avec les options par défaut

#### C. PostgreSQL (base de données)

**Sur Ubuntu/Debian :**
```bash
# Installer PostgreSQL 15
sudo apt install postgresql postgresql-contrib -y

# Démarrer le service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Vérifier le statut
sudo systemctl status postgresql
```

#### D. Nginx (serveur web)

```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### E. Docker (optionnel, recommandé pour l'IA)

```bash
# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Ajouter votre utilisateur au groupe docker
sudo usermod -aG docker $USER

# Redémarrer la session
logout
# Reconnectez-vous

# Vérifier l'installation
docker --version
```

---

## 3. Récupération du code source

### Méthode 1 : Via GitHub (Recommandée)

#### Étape 1 : Connecter Lovable à GitHub

1. Ouvrez votre projet EXED Manager dans Lovable
2. Cliquez sur l'icône **GitHub** dans la barre latérale gauche
3. Cliquez sur **"Connect to GitHub"**
4. Autorisez Lovable à accéder à votre compte GitHub
5. Cliquez sur **"Create Repository"**
6. Notez l'URL du dépôt créé (ex: `https://github.com/votre-nom/exed-manager`)

#### Étape 2 : Cloner le dépôt sur votre serveur

```bash
# Sur votre serveur, naviguez vers le dossier souhaité
cd /var/www

# Clonez le dépôt (remplacez l'URL par la vôtre)
git clone https://github.com/votre-nom/exed-manager.git

# Entrez dans le dossier
cd exed-manager

# Vérifiez les fichiers
ls -la
```

### Méthode 2 : Téléchargement ZIP

#### Via l'interface Lovable

1. Dans Lovable, cliquez sur l'icône **GitHub**
2. Si le dépôt est créé, allez sur GitHub
3. Cliquez sur le bouton vert **"Code"**
4. Cliquez sur **"Download ZIP"**
5. Transférez le ZIP sur votre serveur via SFTP (FileZilla, WinSCP)

#### Extraction sur le serveur

```bash
# Installer unzip si nécessaire
sudo apt install unzip -y

# Extraire le ZIP
unzip exed-manager-main.zip -d /var/www/

# Renommer le dossier
mv /var/www/exed-manager-main /var/www/exed-manager

cd /var/www/exed-manager
```

---

## 4. Configuration de l'environnement serveur

### 4.1 Créer le fichier de configuration

Créez un fichier `.env` à la racine du projet :

```bash
cd /var/www/exed-manager
nano .env
```

Collez ce contenu (en remplaçant les valeurs) :

```env
# Configuration Supabase/PostgreSQL
VITE_SUPABASE_URL=http://votre-serveur:8000
VITE_SUPABASE_PUBLISHABLE_KEY=votre-clé-anon

# Configuration du serveur
PORT=3000
NODE_ENV=production

# Configuration LLM pour le chatbot (voir section 8)
LLM_API_URL=http://localhost:11434/v1/chat/completions
LLM_MODEL=llama3.2
LLM_API_KEY=

# Configuration email (optionnel)
SMTP_HOST=smtp.votreserveur.com
SMTP_PORT=587
SMTP_USER=noreply@votredomaine.com
SMTP_PASS=votre-mot-de-passe
```

Sauvegardez avec `Ctrl+X`, puis `Y`, puis `Entrée`.

### 4.2 Installer les dépendances

```bash
cd /var/www/exed-manager

# Installer les dépendances Node.js
npm install

# Cela peut prendre 2-5 minutes selon votre connexion
```

### 4.3 Compiler l'application

```bash
# Construire l'application pour la production
npm run build

# Les fichiers compilés seront dans le dossier "dist"
ls dist/
```

---

## 5. Installation de la base de données

### Option A : Supabase auto-hébergé (Recommandé)

Supabase peut être installé sur votre serveur avec Docker :

#### Étape 1 : Cloner Supabase

```bash
cd /opt
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
```

#### Étape 2 : Configurer Supabase

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer la configuration
nano .env
```

Modifiez ces valeurs importantes :

```env
# Changez ces valeurs par des mots de passe sécurisés !
POSTGRES_PASSWORD=votre-mot-de-passe-postgres-fort
JWT_SECRET=votre-secret-jwt-tres-long-minimum-32-caracteres
ANON_KEY=générez-une-clé-avec-jwt.io
SERVICE_ROLE_KEY=générez-une-clé-avec-jwt.io

# Votre domaine
SITE_URL=https://exed.votredomaine.com
API_EXTERNAL_URL=https://api.exed.votredomaine.com
```

#### Étape 3 : Lancer Supabase

```bash
docker compose up -d

# Vérifier que tous les services sont lancés
docker compose ps
```

#### Étape 4 : Importer le schéma de base de données

Les migrations sont dans `supabase/migrations/`. Appliquez-les :

```bash
# Se connecter à PostgreSQL
docker exec -it supabase-db-1 psql -U postgres

# Dans le shell PostgreSQL, exécutez chaque fichier de migration
# Ou utilisez l'interface Supabase Studio à http://localhost:3000
```

### Option B : PostgreSQL standalone

Si vous n'utilisez pas Supabase complet :

```bash
# Créer un utilisateur et une base de données
sudo -u postgres psql

CREATE USER exed WITH PASSWORD 'votre-mot-de-passe';
CREATE DATABASE exed_manager OWNER exed;
GRANT ALL PRIVILEGES ON DATABASE exed_manager TO exed;
\q

# Importer le schéma
psql -U exed -d exed_manager -f schema.sql
```

---

## 6. Déploiement du frontend

### 6.1 Configuration Nginx

Créez un fichier de configuration Nginx :

```bash
sudo nano /etc/nginx/sites-available/exed-manager
```

Contenu :

```nginx
server {
    listen 80;
    server_name exed.votredomaine.com;
    
    # Redirection HTTPS (recommandé)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name exed.votredomaine.com;

    # Certificats SSL (voir section 6.2)
    ssl_certificate /etc/letsencrypt/live/exed.votredomaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/exed.votredomaine.com/privkey.pem;

    # Dossier racine de l'application
    root /var/www/exed-manager/dist;
    index index.html;

    # Gestion du routage React
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache pour les assets statiques
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy pour les API Supabase
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Proxy pour les Edge Functions
    location /functions/ {
        proxy_pass http://localhost:54321/functions/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Activez le site :

```bash
sudo ln -s /etc/nginx/sites-available/exed-manager /etc/nginx/sites-enabled/
sudo nginx -t  # Vérifier la syntaxe
sudo systemctl reload nginx
```

### 6.2 Certificat SSL (HTTPS)

```bash
# Installer Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtenir un certificat
sudo certbot --nginx -d exed.votredomaine.com

# Le renouvellement est automatique
```

---

## 7. Déploiement du backend (Edge Functions)

### 7.1 Option A : Supabase Edge Functions (avec Docker)

Si vous utilisez Supabase auto-hébergé, les Edge Functions sont incluses.

Copiez vos fonctions :

```bash
cp -r /var/www/exed-manager/supabase/functions/* /opt/supabase/docker/volumes/functions/
```

### 7.2 Option B : Deno Deploy (alternatif)

Les Edge Functions peuvent être déployées sur Deno Deploy :

1. Créez un compte sur https://deno.com/deploy
2. Liez votre dépôt GitHub
3. Configurez le déploiement automatique

### 7.3 Option C : Serveur Deno local

```bash
# Installer Deno
curl -fsSL https://deno.land/install.sh | sh

# Ajouter au PATH
echo 'export DENO_INSTALL="$HOME/.deno"' >> ~/.bashrc
echo 'export PATH="$DENO_INSTALL/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Créer un service systemd
sudo nano /etc/systemd/system/exed-functions.service
```

Contenu du service :

```ini
[Unit]
Description=EXED Edge Functions
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/exed-manager/supabase/functions
ExecStart=/home/votre-user/.deno/bin/deno run --allow-all --watch assistant-chat/index.ts
Restart=on-failure
Environment=LLM_API_URL=http://localhost:11434/v1/chat/completions
Environment=LLM_MODEL=llama3.2

[Install]
WantedBy=multi-user.target
```

Démarrer le service :

```bash
sudo systemctl daemon-reload
sudo systemctl start exed-functions
sudo systemctl enable exed-functions
```

---

## 8. Configuration du Chatbot IA

### 8.1 Installation d'Ollama (recommandé)

Ollama permet d'exécuter des modèles IA open source localement.

```bash
# Installer Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Télécharger un modèle (choisissez selon vos ressources)
# Modèle léger (~4 Go RAM) :
ollama pull llama3.2

# Modèle moyen (~8 Go RAM) :
ollama pull llama3.1

# Modèle pour le code (~8 Go RAM) :
ollama pull codellama

# Vérifier que le modèle fonctionne
ollama run llama3.2 "Bonjour, est-ce que tu fonctionnes ?"
```

### 8.2 Démarrer Ollama comme service

```bash
# Ollama démarre automatiquement après installation
# Vérifier le statut
sudo systemctl status ollama

# Si besoin de redémarrer
sudo systemctl restart ollama
```

### 8.3 Configurer l'Edge Function

Modifiez les variables d'environnement pour l'Edge Function `assistant-chat` :

```bash
# Si vous utilisez Supabase Docker
nano /opt/supabase/docker/.env

# Ajoutez ces lignes :
LLM_API_URL=http://host.docker.internal:11434/v1/chat/completions
LLM_MODEL=llama3.2
LLM_API_KEY=
```

### 8.4 Tester le chatbot

```bash
# Tester l'API Ollama directement
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2",
    "messages": [{"role": "user", "content": "Bonjour !"}]
  }'
```

### 8.5 Modèles IA recommandés

| Modèle | RAM requise | Usage | Commande |
|--------|-------------|-------|----------|
| llama3.2 | 4 Go | Général, conversations | `ollama pull llama3.2` |
| llama3.1 | 8 Go | Meilleure qualité | `ollama pull llama3.1` |
| mistral | 4 Go | Rapide, bon en français | `ollama pull mistral` |
| codellama | 8 Go | Questions techniques | `ollama pull codellama` |
| phi3 | 2 Go | Très léger | `ollama pull phi3` |

---

## 9. Synchronisation avec Lovable

### 9.1 Synchronisation bidirectionnelle via GitHub

Une fois GitHub connecté, la synchronisation est automatique :

```
Lovable → GitHub → Votre Serveur
Votre Serveur → GitHub → Lovable
```

#### Récupérer les mises à jour de Lovable

```bash
cd /var/www/exed-manager

# Récupérer les dernières modifications
git pull origin main

# Réinstaller les dépendances si nécessaire
npm install

# Reconstruire l'application
npm run build

# Redémarrer les services si nécessaire
sudo systemctl reload nginx
```

#### Envoyer vos modifications vers Lovable

```bash
cd /var/www/exed-manager

# Voir les fichiers modifiés
git status

# Ajouter les modifications
git add .

# Créer un commit
git commit -m "Description de vos modifications"

# Envoyer vers GitHub (et donc Lovable)
git push origin main
```

### 9.2 Script de déploiement automatique

Créez un script pour automatiser les mises à jour :

```bash
nano /var/www/exed-manager/deploy.sh
```

Contenu :

```bash
#!/bin/bash

# Script de déploiement EXED Manager
# Usage: ./deploy.sh

set -e  # Arrêter en cas d'erreur

echo "🚀 Démarrage du déploiement EXED Manager..."

cd /var/www/exed-manager

# Récupérer les dernières modifications
echo "📥 Récupération des mises à jour..."
git pull origin main

# Installer les dépendances
echo "📦 Installation des dépendances..."
npm install

# Construire l'application
echo "🔨 Construction de l'application..."
npm run build

# Redémarrer les services
echo "🔄 Redémarrage des services..."
sudo systemctl reload nginx

echo "✅ Déploiement terminé avec succès !"
echo "📅 Date: $(date)"
```

Rendez le script exécutable :

```bash
chmod +x /var/www/exed-manager/deploy.sh
```

### 9.3 Webhook pour déploiement automatique (avancé)

Pour un déploiement automatique à chaque push GitHub :

1. Installez un serveur webhook :

```bash
npm install -g webhook
```

2. Créez la configuration :

```bash
nano /etc/webhook/hooks.json
```

```json
[
  {
    "id": "exed-deploy",
    "execute-command": "/var/www/exed-manager/deploy.sh",
    "command-working-directory": "/var/www/exed-manager",
    "trigger-rule": {
      "match": {
        "type": "payload-hash-sha256",
        "secret": "votre-secret-webhook",
        "parameter": {
          "source": "header",
          "name": "X-Hub-Signature-256"
        }
      }
    }
  }
]
```

3. Configurez le webhook dans GitHub :
   - Allez dans Settings → Webhooks → Add webhook
   - URL : `https://exed.votredomaine.com/hooks/exed-deploy`
   - Secret : le même que dans hooks.json
   - Events : Just the push event

---

## 10. Maintenance et mises à jour

### 10.1 Sauvegardes

#### Sauvegarde de la base de données

```bash
# Créer un script de sauvegarde
nano /opt/scripts/backup-exed.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/exed"

mkdir -p $BACKUP_DIR

# Sauvegarde PostgreSQL
pg_dump -U exed exed_manager > $BACKUP_DIR/db_$DATE.sql

# Sauvegarde des fichiers uploadés
tar -czf $BACKUP_DIR/storage_$DATE.tar.gz /var/www/exed-manager/storage/

# Supprimer les sauvegardes de plus de 30 jours
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Sauvegarde terminée : $DATE"
```

```bash
chmod +x /opt/scripts/backup-exed.sh

# Ajouter au cron pour sauvegarde quotidienne à 2h du matin
crontab -e
# Ajouter : 0 2 * * * /opt/scripts/backup-exed.sh
```

### 10.2 Monitoring

#### Installer et configurer les logs

```bash
# Logs Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Logs de l'application (si PM2)
pm2 logs exed-manager
```

### 10.3 Mises à jour de sécurité

```bash
# Mettre à jour le système régulièrement
sudo apt update && sudo apt upgrade -y

# Mettre à jour les dépendances Node.js
cd /var/www/exed-manager
npm audit
npm audit fix
```

---

## 11. Dépannage

### Problèmes courants

#### L'application ne démarre pas

```bash
# Vérifier les logs
npm run build 2>&1 | tail -50

# Vérifier les permissions
ls -la /var/www/exed-manager/

# Corriger les permissions
sudo chown -R www-data:www-data /var/www/exed-manager/
```

#### La base de données ne répond pas

```bash
# Vérifier PostgreSQL
sudo systemctl status postgresql

# Vérifier les connexions
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Redémarrer si nécessaire
sudo systemctl restart postgresql
```

#### Le chatbot ne fonctionne pas

```bash
# Vérifier Ollama
ollama list
curl http://localhost:11434/api/tags

# Redémarrer Ollama
sudo systemctl restart ollama

# Tester manuellement
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "llama3.2", "messages": [{"role": "user", "content": "Test"}]}'
```

#### Erreur "Module not found"

```bash
# Supprimer et réinstaller les dépendances
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### Erreur SSL/HTTPS

```bash
# Renouveler le certificat
sudo certbot renew

# Vérifier la configuration Nginx
sudo nginx -t
sudo systemctl reload nginx
```

---

## Récapitulatif des commandes essentielles

```bash
# Déployer une mise à jour
cd /var/www/exed-manager && git pull && npm install && npm run build

# Redémarrer tous les services
sudo systemctl restart nginx postgresql ollama

# Voir les logs en temps réel
tail -f /var/log/nginx/error.log

# Sauvegarder manuellement
/opt/scripts/backup-exed.sh

# Tester le chatbot
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "llama3.2", "messages": [{"role": "user", "content": "Bonjour"}]}'
```

---

## Support

- **Documentation Lovable** : https://docs.lovable.dev
- **Documentation Supabase** : https://supabase.com/docs
- **Documentation Ollama** : https://ollama.com/docs
- **Discord Lovable** : https://discord.gg/lovable

---

*Guide créé pour EXED Manager 365 - CentraleSupélec EXED Campus Casablanca*
