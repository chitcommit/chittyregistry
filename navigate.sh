#!/opt/homebrew/bin/bash

# ChittyOS Interactive Project Navigator
# Usage: ./navigate.sh or source navigate.sh && nav

# Check for bash 4.0+ (associative arrays)
if [ "${BASH_VERSION%%.*}" -lt 4 ]; then
    echo "❌ This script requires Bash 4.0 or higher for associative arrays"
    echo "💡 Try: brew install bash (on macOS)"
    exit 1
fi

set -e

# Color codes for better visibility
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Project definitions
declare -A PROJECTS=(
    # Core Platform Services
    ["1"]="chittychat|🟢 ChittyChat|Unified platform & worker|cd chittychat/ && npm run dev"
    ["2"]="chittyrouter|🟢 ChittyRouter|AI gateway & routing|cd chittyrouter/ && npm start"
    ["3"]="chittyschema|🟢 ChittySchema|Universal data framework|cd chittyschema/ && npm run dev"
    ["4"]="chittyregistry|🟡 ChittyRegistry|Service discovery|cd chittyregistry/ && ./start.sh"

    # Management & Tools
    ["5"]="chittydashboard|🟢 ChittyDashboard|Command center|cd chittydashboard/ && npm run serve"
    ["6"]="chittyid|🟢 ChittyID|Identity & blockchain|cd chittyid/ && ./mint-id.sh"
    ["7"]="chittycheck|🟢 ChittyCheck|Compliance validation|./chittycheck/chittycheck-enhanced.sh"
    ["8"]="chittycleaner|🟡 ChittyCleaner|System cleanup|./chittycleaner/cleanup-system.sh"

    # Domain Applications
    ["9"]="chittycases|🟢 ChittyCases|Legal case management|cd chittycases/ && python app.py"
    ["10"]="chittybrand|🟡 ChittyBrand|Brand compliance|cd chittybrand/ && ./brand-cli-tool.js"
    ["11"]="chittyauth|🟡 ChittyAuth|Authentication|cd chittyauth/ && npm run auth-server"
    ["12"]="chittyassets|🔵 ChittyAssets|Asset management|cd chittyassets/ && ./asset-manager.sh"

    # Development & Integration
    ["13"]="chittycli|🟢 ChittyCLI|Unified CLI|cd chittycli/ && npm run cli"
    ["14"]="chittyos|🟡 ChittyOS|System integration|cd chittyos/ && ./system-init.sh"
    ["15"]="launch_chitty|🔵 LaunchChitty|Deployment|cd launch_chitty/ && ./deploy.sh"

    # Data & Archives
    ["16"]="legal|🟡 Legal|Legal documents|cd legal/ && ls -la"
    ["17"]="system|🟡 System|System utilities|cd system/ && ./status.sh"
)

show_header() {
    clear
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${WHITE}                  🚦 ChittyOS Project Navigator                  ${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

show_categories() {
    echo -e "${YELLOW}🌐 Core Platform Services${NC}"
    for i in {1..4}; do
        if [[ -n "${PROJECTS[$i]}" ]]; then
            IFS='|' read -r dir status name desc cmd <<< "${PROJECTS[$i]}"
            printf "  ${GREEN}%2s${NC}. %s %s\n" "$i" "$status" "$name"
        fi
    done
    echo ""

    echo -e "${YELLOW}🛠️  Management & Tools${NC}"
    for i in {5..8}; do
        if [[ -n "${PROJECTS[$i]}" ]]; then
            IFS='|' read -r dir status name desc cmd <<< "${PROJECTS[$i]}"
            printf "  ${GREEN}%2s${NC}. %s %s\n" "$i" "$status" "$name"
        fi
    done
    echo ""

    echo -e "${YELLOW}📊 Domain Applications${NC}"
    for i in {9..12}; do
        if [[ -n "${PROJECTS[$i]}" ]]; then
            IFS='|' read -r dir status name desc cmd <<< "${PROJECTS[$i]}"
            printf "  ${GREEN}%2s${NC}. %s %s\n" "$i" "$status" "$name"
        fi
    done
    echo ""

    echo -e "${YELLOW}🧪 Development & Integration${NC}"
    for i in {13..15}; do
        if [[ -n "${PROJECTS[$i]}" ]]; then
            IFS='|' read -r dir status name desc cmd <<< "${PROJECTS[$i]}"
            printf "  ${GREEN}%2s${NC}. %s %s\n" "$i" "$status" "$name"
        fi
    done
    echo ""

    echo -e "${YELLOW}📁 Data & System${NC}"
    for i in {16..17}; do
        if [[ -n "${PROJECTS[$i]}" ]]; then
            IFS='|' read -r dir status name desc cmd <<< "${PROJECTS[$i]}"
            printf "  ${GREEN}%2s${NC}. %s %s\n" "$i" "$status" "$name"
        fi
    done
    echo ""
}

show_special_commands() {
    echo -e "${PURPLE}🎛️  Orchestrator Commands${NC}"
    echo -e "  ${GREEN}h${NC}.  Run ChittyCheck health validation"
    echo -e "  ${GREEN}s${NC}.  System status and project overview"
    echo -e "  ${GREEN}c${NC}.  Cleanup and maintenance"
    echo -e "  ${GREEN}r${NC}.  Registry management"
    echo -e "  ${GREEN}a${NC}.  Archive/restore project operations"
    echo ""
    echo -e "  ${GREEN}q${NC}.  Quit navigator"
    echo -e "  ${GREEN}?${NC}.  Show this menu"
    echo ""
}

execute_project() {
    local choice="$1"

    if [[ -n "${PROJECTS[$choice]}" ]]; then
        IFS='|' read -r dir status name desc cmd <<< "${PROJECTS[$choice]}"
        echo -e "${CYAN}🚀 Launching: ${WHITE}$name${NC}"
        echo -e "${BLUE}📁 Directory: ${WHITE}$dir${NC}"
        echo -e "${BLUE}📝 Command: ${WHITE}$cmd${NC}"
        echo ""

        read -p "Execute this command? [Y/n]: " confirm
        confirm=${confirm:-Y}

        if [[ $confirm =~ ^[Yy]$ ]]; then
            echo -e "${GREEN}▶️  Executing...${NC}"
            echo ""
            eval "$cmd"
        else
            echo -e "${YELLOW}❌ Cancelled${NC}"
            sleep 1
        fi
    else
        echo -e "${RED}❌ Invalid selection: $choice${NC}"
        sleep 2
    fi
}

execute_special() {
    case "$1" in
        "h"|"H")
            echo -e "${CYAN}🔍 Running ChittyCheck validation...${NC}"
            ./chittycheck/chittycheck-enhanced.sh
            ;;
        "s"|"S")
            echo -e "${CYAN}📊 System status...${NC}"
            ./chittychat/slash-commands-extended.sh status
            ;;
        "c"|"C")
            echo -e "${CYAN}🧹 Running cleanup...${NC}"
            ./chittycleaner/cleanup-system.sh
            ;;
        "r"|"R")
            echo -e "${CYAN}🔖 Registry management...${NC}"
            ./chittychat/claude-registry-client.sh
            ;;
        "a"|"A")
            echo -e "${CYAN}📦 Archive operations...${NC}"
            echo "Available operations:"
            echo "1. Archive project"
            echo "2. Restore project"
            echo "3. List archived projects"
            read -p "Select operation [1-3]: " arch_choice
            case $arch_choice in
                1) read -p "Project to archive: " proj; ./system/archive-project.sh "$proj" ;;
                2) read -p "Project to restore: " proj; ./system/restore-archived-project.sh "$proj" ;;
                3) ls -la archives/ 2>/dev/null || echo "No archives directory found" ;;
            esac
            ;;
        *)
            echo -e "${RED}❌ Unknown command: $1${NC}"
            sleep 2
            ;;
    esac
}

main_loop() {
    while true; do
        show_header
        show_categories
        show_special_commands

        echo -e "${WHITE}Select a project or command:${NC}"
        read -p "> " choice

        case "$choice" in
            "q"|"Q"|"quit"|"exit")
                echo -e "${GREEN}👋 Goodbye!${NC}"
                break
                ;;
            "?"|"help")
                continue
                ;;
            [1-9]|1[0-7])
                execute_project "$choice"
                echo ""
                read -p "Press Enter to continue..."
                ;;
            [hHsScCrRaA])
                execute_special "$choice"
                echo ""
                read -p "Press Enter to continue..."
                ;;
            *)
                echo -e "${RED}❌ Invalid selection. Use 1-17, h/s/c/r/a, or q to quit${NC}"
                sleep 2
                ;;
        esac
    done
}

# Function to be sourced for quick access
nav() {
    main_loop
}

# If script is executed directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main_loop
fi