#!/usr/bin/env bash
# Script de build exécuté par Render à chaque déploiement
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt

python manage.py migrate --no-input
python manage.py collectstatic --no-input --clear
