#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
python mealshare/manage.py migrate
python mealshare/manage.py collectstatic --noinput