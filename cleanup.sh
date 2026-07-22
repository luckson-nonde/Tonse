#!/bin/bash
# Cleanup Script - Move legacy files to archive folder
# For macOS/Linux users

cd "$(dirname "$0")"

echo ""
echo "🧹 ProQuote Zambia Marketplace - Cleanup Script"
echo "====================================="
echo ""
echo "Moving legacy files to archive folder..."
echo ""

# Create archive folder if it doesn't exist
mkdir -p archive

# Move schema analysis files
files=(
    "all_schemas.txt"
    "all_subcategories.txt"
    "categories_with_schema.txt"
    "current_schemas.txt"
    "defined_schemas.txt"
    "used_schemas.txt"
    "FORM_AUDIT.md"
    "inquiry_form_analysis.md"
    "ONBOARDING_IMPLEMENTATION.md"
    "IMPLEMENTATION_SUMMARY.md"
    "investigation_results.md"
    "DOCUMENTATION.md"
    "dynamic_form_schemas.md"
    "TONSE_COLOR_SYSTEM.md"
    "check_schemas.cjs"
    "check_schemas_multi.cjs"
    "audit_schemas.cjs"
    "generate_archetype_config.cjs"
    "generate_schemas_md.js"
    "refactor_categories.js"
    "test_validation.ts"
    "grep_out.txt"
    "metadata.json"
    "FULLSTACK_SETUP.md"
    "INQUIRY_SCHEMAS.md"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        mv "$file" archive/ && echo "✓ Moved: $file"
    fi
done

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Root directory cleaned up. Legacy files moved to archive/"
echo ""
echo "Essential files remaining:"
echo " • backend/"
echo " • src/"
echo " • public/"
echo " • scripts/"
echo " • Documentation files (README.md, QUICK_START.md, etc.)"
echo " • Configuration files (.env.example, docker-compose.yml, etc.)"
echo ""
