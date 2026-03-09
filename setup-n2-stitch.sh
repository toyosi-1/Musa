#!/bin/bash

# N2 Stitch MCP Setup Script for Windsurf
# This script adds N2 Stitch MCP server to your Windsurf configuration

MCP_CONFIG_FILE="$HOME/.codeium/windsurf/mcp_config.json"

echo "Setting up N2 Stitch MCP for Windsurf..."
echo "Target config file: $MCP_CONFIG_FILE"

# Create backup
if [ -f "$MCP_CONFIG_FILE" ]; then
    cp "$MCP_CONFIG_FILE" "$MCP_CONFIG_FILE.backup.$(date +%s)"
    echo "✓ Backup created"
fi

# Create directory if it doesn't exist
mkdir -p "$(dirname "$MCP_CONFIG_FILE")"

# Check if file exists and has content
if [ -f "$MCP_CONFIG_FILE" ] && [ -s "$MCP_CONFIG_FILE" ]; then
    # File exists and has content - merge configuration
    echo "Existing config found, merging..."
    
    # Use jq to merge if available, otherwise manual edit needed
    if command -v jq &> /dev/null; then
        jq '. + {
            "mcpServers": ((.mcpServers // {}) + {
                "n2-stitch": {
                    "url": "https://cloud.nton2.com/mcp",
                    "headers": {
                        "X-API-Key": "n2_sk_live_irvf1n82kgesd270esdc5ojmbg5urisl"
                    }
                }
            })
        }' "$MCP_CONFIG_FILE" > "$MCP_CONFIG_FILE.tmp" && mv "$MCP_CONFIG_FILE.tmp" "$MCP_CONFIG_FILE"
        echo "✓ N2 Stitch MCP configuration added using jq"
    else
        echo "⚠ jq not found. Please manually add this to your $MCP_CONFIG_FILE:"
        echo ""
        echo '  "mcpServers": {'
        echo '    "n2-stitch": {'
        echo '      "url": "https://cloud.nton2.com/mcp",'
        echo '      "headers": {'
        echo '        "X-API-Key": "n2_sk_live_irvf1n82kgesd270esdc5ojmbg5urisl"'
        echo '      }'
        echo '    }'
        echo '  }'
        echo ""
    fi
else
    # File doesn't exist or is empty - create new
    echo "Creating new config file..."
    cat > "$MCP_CONFIG_FILE" << 'EOF'
{
  "mcpServers": {
    "n2-stitch": {
      "url": "https://cloud.nton2.com/mcp",
      "headers": {
        "X-API-Key": "n2_sk_live_irvf1n82kgesd270esdc5ojmbg5urisl"
      }
    }
  }
}
EOF
    echo "✓ New config file created with N2 Stitch MCP"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Restart Windsurf completely (Cmd+Q and reopen)"
echo "2. N2 Stitch will be available for design enhancements"
echo "3. You can now use it to generate UI components, icons, and design assets"
echo ""
echo "To verify the setup, check: $MCP_CONFIG_FILE"
