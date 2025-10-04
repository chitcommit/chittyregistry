#!/bin/bash
# Demo: ChittyOS CLI Project Detection Fix
# Shows how the enhanced CLI prevents "no project" errors

echo "🚀 ChittyOS CLI Project Detection Demo"
echo "======================================"
echo

# Test current directory (should detect registry project)
echo "📍 Testing current directory (registry project):"
if [ -f ".chittyos/hooks/project-detect" ]; then
    ./.chittyos/hooks/project-detect
    echo "   ✅ Project detected - Universal Intake System will store files properly"
else
    echo "   ❌ No project detected - files would go to general storage"
fi
echo

# Test a temporary directory (simulates the original problem)
echo "📍 Testing temporary directory (no project):"
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"
echo "   Directory: $TEMP_DIR"

# Check if project detection would work
if [ -f ".chittyos/hooks/project-detect" ]; then
    echo "   ✅ Project detected"
else
    echo "   ❌ No project detected"
    echo "   💡 ChittyOS CLI would now:"
    echo "      1. Offer to create minimal project marker"
    echo "      2. Create .chittyos/marker.json"
    echo "      3. Create .chittyos/hooks/project-detect"
    echo "      4. Prevent Universal Intake System errors"

    # Simulate what the CLI would create
    mkdir -p .chittyos/hooks
    cat > .chittyos/marker.json << EOF
{
  "name": "$(basename "$PWD")",
  "type": "chittyos-external",
  "marker": true,
  "purpose": "Prevent Universal Intake System 'no project' errors",
  "created": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
}
EOF

    cat > .chittyos/hooks/project-detect << 'EOF'
#!/bin/bash
export CHITTYOS_PROJECT_DETECTED=true
export CHITTYOS_PROJECT_TYPE="chittyos-external"
export CHITTYOS_PROJECT_NAME="$(basename $PWD)"
export CHITTYOS_PROJECT_MARKER=true
echo "📁 ChittyOS External Project: $(basename $PWD)"
EOF
    chmod +x .chittyos/hooks/project-detect

    echo "   ✅ Minimal marker created!"
    ./.chittyos/hooks/project-detect
fi

# Clean up
cd - > /dev/null
rm -rf "$TEMP_DIR"
echo

echo "🎉 Summary:"
echo "   • Enhanced project detection with confidence scoring"
echo "   • Automatic ChittyOS project configuration"
echo "   • Minimal markers for external projects"
echo "   • Universal Intake System integration"
echo "   • Prevents 'no project detected, storing in general' errors"