#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import glob from 'glob';

function fixLdoTypes() {
  const srcLdoPath = path.join(process.cwd(), 'src', '.ldo');
  
  const contextFiles = glob.sync('*.context.ts', { cwd: srcLdoPath });
  
  for (const contextFile of contextFiles) {
    const fullContextPath = path.join(srcLdoPath, contextFile);
    const content = fs.readFileSync(fullContextPath, 'utf8');
    
    const hasNumericTypes = /XMLSchema#(double|float)/.test(content);
    
    if (hasNumericTypes) {
      console.log(`Found numeric types in ${contextFile}, processing...`);
      
      const numericFields = [];
      const matches = content.match(/(\w+):\s*{[^}]*?"@type":\s*"[^"]*XMLSchema#(double|float)[^}]*?}/g);
      
      if (matches) {
        matches.forEach(match => {
          const fieldMatch = match.match(/^(\w+):/);
          if (fieldMatch) {
            numericFields.push(fieldMatch[1]);
          }
        });
      }

      console.log(`Numeric fields: ${numericFields.join(', ')}`);
      
      const typingsFile = contextFile.replace('.context.ts', '.typings.ts');
      const fullTypingsPath = path.join(srcLdoPath, typingsFile);
      
      if (fs.existsSync(fullTypingsPath)) {
        let typingsContent = fs.readFileSync(fullTypingsPath, 'utf8');
        let changed = false;
        
        numericFields.forEach(field => {
          const regex = new RegExp(`(\\s+${field}\\??:\\s*)string(\\s*;)`, 'g');
          if (regex.test(typingsContent)) {
            typingsContent = typingsContent.replace(regex, '$1number$2');
            changed = true;
            console.log(`Fixed ${field}: string -> number`);
          }
        });
        
        if (changed) {
          fs.writeFileSync(fullTypingsPath, typingsContent);
        }
      }
    }
  }
}

fixLdoTypes();