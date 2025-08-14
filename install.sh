#!/bin/bash
echo "Installing dependencies with legacy peer deps..."
npm install --legacy-peer-deps

# Ensure critical dependencies are installed
npm install tailwindcss@latest postcss@latest autoprefixer@latest --save-dev --legacy-peer-deps

echo "Dependencies installed successfully!"
