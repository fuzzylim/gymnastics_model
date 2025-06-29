#!/bin/bash

# Setup git commit message template
git config --local commit.template .gitmessage

# Create pre-commit hook for documentation reminder
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

echo "📝 Documentation Reminder:"
echo "  Have you updated the relevant documentation?"
echo "  - Project docs in docs/1-projects/"
echo "  - Architecture/Security docs if needed"
echo "  - Code examples in docs/3-resources/"
echo "  - Using Australian English"
echo ""
echo "Press Enter to continue or Ctrl+C to cancel and update docs..."
read -r

exit 0
EOF

chmod +x .git/hooks/pre-commit

echo "✅ Git hooks configured successfully!"
echo "   - Commit message template set"
echo "   - Pre-commit documentation reminder enabled"