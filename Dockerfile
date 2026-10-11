# Utiliser Node.js 20 LTS base Alpine pour la légèreté et la sécurité
FROM node:20-alpine

# Définir le répertoire de travail
WORKDIR /app

# Installer les dépendances nécessaires pour les modules natifs (si besoin)
RUN apk add --no-cache python3 make g++

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances de production
RUN npm ci --omit=dev

# Copier l'ensemble du projet
COPY . .

# Créer les dossiers de stockage si nécessaire avec les bonnes permissions
RUN mkdir -p uploads public/img/partners

# Variable d'environnement par défaut pour le port
ENV PORT=3000
ENV NODE_ENV=production

# Exposer le port d'écoute
EXPOSE 3000

# Commande de démarrage
CMD ["node", "server.js"]
