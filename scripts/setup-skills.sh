#!/usr/bin/env bash
# Los 5 skills de diseño OBLIGATORIOS (sección 11 del prompt maestro) ya están
# VENDORIZADOS en .claude/skills/ y versionados en el repo — no hace falta
# instalar nada: cualquier sesión de Claude Code en este repo los carga.
#
# Instalados (2026-07-11):
#   1. ui-ux-pro-max  → skills: design, design-system, ui-styling, brand,
#      banner-design, slides (de nextlevelbuilder/ui-ux-pro-max-skill; el
#      /plugin marketplace no estaba disponible en el entorno remoto, así que
#      se copiaron los skills autocontenidos del plugin)
#   2. frontend-design → de anthropics/skills (dirección estética, anti-genérico)
#   3. emil-design-eng → de emilkowalski/skill (animación y micro-interacciones)
#   4. huashu-design   → de alchaincyf/huashu-design (prototipos clickeables)
#   5. web-design-guidelines → de vercel-labs/web-interface-guidelines (el repo
#      ya no publica SKILL.md; se convirtió su AGENTS.md en skill)
#
# Este script re-instala/actualiza desde los orígenes si hiciera falta.
set -euo pipefail

echo "== emil-design-eng (Emil Kowalski) =="
npx -y skills add https://github.com/emilkowalski/skill --skill emil-design-eng --agent claude-code -y || true

echo "== huashu-design (alchaincyf) =="
npx -y skills add alchaincyf/huashu-design --skill huashu-design --agent claude-code -y || true

echo "== ui-ux-pro-max: en Claude Code interactivo se puede usar el plugin =="
echo "   /plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill"
echo "   /plugin install ui-ux-pro-max@ui-ux-pro-max-skill"

echo "== web-design-guidelines: regenerar desde AGENTS.md del repo de Vercel =="
echo "   git clone https://github.com/vercel-labs/web-interface-guidelines"

echo "Verifica con /skills dentro de Claude Code."
