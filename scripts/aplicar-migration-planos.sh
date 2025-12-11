#!/bin/bash
# Script para aplicar migration de planos e assinaturas

echo "🚀 Aplicando migration: Sistema de Planos e Assinaturas"
echo "================================================"

# Ler o SQL da migration
SQL_FILE="./supabase/migrations/20251210_planos_assinaturas.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "❌ Arquivo de migration não encontrado: $SQL_FILE"
  exit 1
fi

echo "📄 Migration encontrada: $SQL_FILE"
echo ""
echo "⚠️  ATENÇÃO: Execute o conteúdo deste arquivo no Supabase SQL Editor:"
echo ""
echo "1. Abra https://supabase.com/dashboard"
echo "2. Vá em SQL Editor"
echo "3. Cole o conteúdo de: $SQL_FILE"
echo "4. Clique em RUN"
echo ""
echo "Ou copie e cole o comando abaixo:"
echo "================================================"
cat "$SQL_FILE"
echo "================================================"
