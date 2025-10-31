#!/bin/bash

###############################################################################
# SQLite Database Backup Script
#
# This script creates timestamped backups of the SQLite database
# Usage: ./scripts/backup-database.sh
###############################################################################

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$PROJECT_DIR/data"
BACKUP_DIR="$PROJECT_DIR/backups"
DB_FILE="$DATA_DIR/ubv-bot.db"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if database exists
if [ ! -f "$DB_FILE" ]; then
    echo -e "${YELLOW}⚠️  Database file not found: $DB_FILE${NC}"
    echo "   Creating empty database..."
    cd "$PROJECT_DIR"
    node -e "import('./src/database/sqlite.js')"
fi

# Create timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/ubv-bot_${TIMESTAMP}.db"

# Perform backup
echo -e "${BLUE}🔄 Starting database backup...${NC}"
echo "   Source: $DB_FILE"
echo "   Destination: $BACKUP_FILE"

# Use sqlite3 .backup command for safe backup (if sqlite3 is installed)
if command -v sqlite3 &> /dev/null; then
    sqlite3 "$DB_FILE" ".backup '$BACKUP_FILE'"
    BACKUP_STATUS=$?
else
    # Fallback to simple copy
    cp "$DB_FILE" "$BACKUP_FILE"
    BACKUP_STATUS=$?
fi

if [ $BACKUP_STATUS -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✅ Backup completed successfully!${NC}"
    echo "   Size: $BACKUP_SIZE"
    echo "   Location: $BACKUP_FILE"

    # List recent backups
    echo ""
    echo -e "${BLUE}📦 Recent backups:${NC}"
    ls -lht "$BACKUP_DIR" | head -6 | tail -5

    # Clean old backups (keep last 30 days)
    echo ""
    echo -e "${BLUE}🧹 Cleaning old backups (keeping last 30 days)...${NC}"
    find "$BACKUP_DIR" -name "ubv-bot_*.db" -mtime +30 -delete
    REMAINING=$(ls -1 "$BACKUP_DIR" | wc -l)
    echo "   Backups remaining: $REMAINING"
else
    echo -e "${YELLOW}❌ Backup failed!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✨ Backup process complete!${NC}"
