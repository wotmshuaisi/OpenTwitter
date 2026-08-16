// Template preprocessor to handle EJS includes (EJS v6 compatibility)
const fs = require('fs');
const path = require('path');

function preprocessTemplate(template, options = {}) {
  let result = template;
  
  // Match <% include path/to/file %> or <% include 'path/to/file' %> or <% include "path/to/file" %>
  const includeRegex = /<% include\s+(?:(?:['"])([^'"\n]+)(?:['"]))|(<% include\s+\S+\s*%>)/g;
  
  result = result.replace(includeRegex, (match, filePath, fullMatch) => {
    try {
      // If we matched the full tag without quotes, extract the path
      if (!filePath && fullMatch) {
        const pathMatch = fullMatch.match(/include\s+(.+?)\s*%>/);
        if (pathMatch) {
          filePath = pathMatch[1].trim();
        } else {
          console.warn('Template preprocessor: Could not extract path from:', fullMatch);
          return '';
        }
      }
      
      if (!filePath) {
        console.warn('Template preprocessor: No file path found');
        return '';
      }
      
      // Resolve the file path relative to the views directory
      const viewsDir = options.views || path.join(__dirname, '..', 'views');
      const fullPath = path.resolve(path.dirname(options.filename || ''), filePath);
      
      if (!fs.existsSync(fullPath)) {
        console.warn(`Template preprocessor: Include file not found: ${fullPath}`);
        return '';
      }
      
      const includedContent = fs.readFileSync(fullPath, 'utf8');
      return includedContent;
    } catch (error) {
      console.error(`Template preprocessor: Error including ${filePath}:`, error.message);
      return '';
    }
  });
  
  return result;
}

module.exports = { preprocessTemplate };
