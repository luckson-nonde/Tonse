@echo off
REM Cleanup Script - Move legacy files to archive folder
REM Run this from the root directory

cd /d "%~dp0"

echo.
echo 🧹 TONSE Marketplace - Cleanup Script
echo =====================================
echo.
echo Moving legacy files to archive folder...
echo.

REM Create archive folder if it doesn't exist
if not exist archive mkdir archive

REM Move schema analysis files
move all_schemas.txt archive\ >nul 2>&1 && echo ✓ Moved: all_schemas.txt
move all_subcategories.txt archive\ >nul 2>&1 && echo ✓ Moved: all_subcategories.txt
move categories_with_schema.txt archive\ >nul 2>&1 && echo ✓ Moved: categories_with_schema.txt
move current_schemas.txt archive\ >nul 2>&1 && echo ✓ Moved: current_schemas.txt
move defined_schemas.txt archive\ >nul 2>&1 && echo ✓ Moved: defined_schemas.txt
move used_schemas.txt archive\ >nul 2>&1 && echo ✓ Moved: used_schemas.txt

REM Move form/inquiry analysis files
move FORM_AUDIT.md archive\ >nul 2>&1 && echo ✓ Moved: FORM_AUDIT.md
move INQUIRY_SCHEMAS.md archive\ >nul 2>&1 && echo ✓ Moved: INQUIRY_SCHEMAS.md
move inquiry_form_analysis.md archive\ >nul 2>&1 && echo ✓ Moved: inquiry_form_analysis.md

REM Move implementation files
move ONBOARDING_IMPLEMENTATION.md archive\ >nul 2>&1 && echo ✓ Moved: ONBOARDING_IMPLEMENTATION.md
move IMPLEMENTATION_SUMMARY.md archive\ >nul 2>&1 && echo ✓ Moved: IMPLEMENTATION_SUMMARY.md
move investigation_results.md archive\ >nul 2>&1 && echo ✓ Moved: investigation_results.md

REM Move old documentation
move DOCUMENTATION.md archive\ >nul 2>&1 && echo ✓ Moved: DOCUMENTATION.md
move dynamic_form_schemas.md archive\ >nul 2>&1 && echo ✓ Moved: dynamic_form_schemas.md
move TONSE_COLOR_SYSTEM.md archive\ >nul 2>&1 && echo ✓ Moved: TONSE_COLOR_SYSTEM.md

REM Move scripts and utilities
move check_schemas.cjs archive\ >nul 2>&1 && echo ✓ Moved: check_schemas.cjs
move check_schemas_multi.cjs archive\ >nul 2>&1 && echo ✓ Moved: check_schemas_multi.cjs
move audit_schemas.cjs archive\ >nul 2>&1 && echo ✓ Moved: audit_schemas.cjs
move generate_archetype_config.cjs archive\ >nul 2>&1 && echo ✓ Moved: generate_archetype_config.cjs
move generate_schemas_md.js archive\ >nul 2>&1 && echo ✓ Moved: generate_schemas_md.js
move refactor_categories.js archive\ >nul 2>&1 && echo ✓ Moved: refactor_categories.js
move test_validation.ts archive\ >nul 2>&1 && echo ✓ Moved: test_validation.ts
move grep_out.txt archive\ >nul 2>&1 && echo ✓ Moved: grep_out.txt
move metadata.json archive\ >nul 2>&1 && echo ✓ Moved: metadata.json

REM Move FULLSTACK_SETUP if it exists (duplicate documentation)
move FULLSTACK_SETUP.md archive\ >nul 2>&1 && echo ✓ Moved: FULLSTACK_SETUP.md

echo.
echo ✅ Cleanup complete!
echo.
echo Root directory cleaned up. Legacy files moved to archive/
echo.
echo Essential files remaining:
echo  • backend/
echo  • src/
echo  • public/
echo  • scripts/
echo  • Documentation files (README.md, QUICK_START.md, etc.)
echo  • Configuration files (.env.example, docker-compose.yml, etc.)
echo.
pause
