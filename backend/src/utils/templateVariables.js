class TemplateVariableProcessor {
  constructor() {
    this.variablePattern = /{{(\w+)}}/g;
    this.conditionalPattern = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g;
    this.loopPattern = /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g;
    this.formatterPattern = /{{(\w+)\|(\w+)(?:\:([^}]+))?}}/g;
  }

  extractVariables(content) {
    const variables = new Map();
    const texts = [content];
    
    // Extract from conditionals
    let match;
    while ((match = this.conditionalPattern.exec(content)) !== null) {
      variables.set(match[1], {
        name: match[1],
        type: 'boolean',
        required: false,
        context: 'conditional'
      });
      texts.push(match[2]);
    }

    // Extract from loops
    while ((match = this.loopPattern.exec(content)) !== null) {
      variables.set(match[1], {
        name: match[1],
        type: 'array',
        required: false,
        context: 'loop'
      });
      texts.push(match[2]);
    }

    // Extract regular variables and formatted variables
    texts.forEach(text => {
      // Regular variables
      let varMatch;
      while ((varMatch = this.variablePattern.exec(text)) !== null) {
        if (!variables.has(varMatch[1])) {
          variables.set(varMatch[1], {
            name: varMatch[1],
            type: 'text',
            required: true,
            context: 'regular'
          });
        }
      }

      // Formatted variables
      while ((varMatch = this.formatterPattern.exec(text)) !== null) {
        if (!variables.has(varMatch[1])) {
          variables.set(varMatch[1], {
            name: varMatch[1],
            type: 'text',
            required: true,
            formatter: varMatch[2],
            formatterArgs: varMatch[3]
          });
        }
      }
    });

    return Array.from(variables.values());
  }

  replaceVariables(content, values = {}) {
    let result = content;

    // Process conditionals
    result = result.replace(this.conditionalPattern, (match, varName, innerContent) => {
      const value = values[varName];
      if (value && value !== 'false' && value !== '0') {
        return this.replaceVariables(innerContent, values);
      }
      return '';
    });

    // Process loops
    result = result.replace(this.loopPattern, (match, varName, innerContent) => {
      const items = values[varName];
      if (Array.isArray(items)) {
        return items.map(item => {
          const itemValues = typeof item === 'object' ? { ...values, ...item } : { ...values, item };
          return this.replaceVariables(innerContent, itemValues);
        }).join('');
      }
      return '';
    });

    // Process formatted variables
    result = result.replace(this.formatterPattern, (match, varName, formatter, args) => {
      const value = values[varName];
      if (value !== undefined) {
        return this.applyFormatter(value, formatter, args);
      }
      return match;
    });

    // Process regular variables
    result = result.replace(this.variablePattern, (match, varName) => {
      const value = values[varName];
      return value !== undefined ? String(value) : match;
    });

    return result;
  }

  applyFormatter(value, formatter, args) {
    switch (formatter) {
      case 'uppercase':
        return String(value).toUpperCase();
      
      case 'lowercase':
        return String(value).toLowerCase();
      
      case 'capitalize':
        return String(value).charAt(0).toUpperCase() + String(value).slice(1).toLowerCase();
      
      case 'currency':
        const currency = args || 'TRY';
        if (typeof value === 'number' || !isNaN(value)) {
          return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: currency
          }).format(Number(value));
        }
        return value;
      
      case 'date':
        const format = args || 'DD/MM/YYYY';
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return this.formatDate(date, format);
        }
        return value;
      
      case 'number':
        if (typeof value === 'number' || !isNaN(value)) {
          const decimals = args ? parseInt(args) : 0;
          return Number(value).toFixed(decimals);
        }
        return value;
      
      case 'truncate':
        const length = args ? parseInt(args) : 50;
        const str = String(value);
        if (str.length > length) {
          return str.substring(0, length) + '...';
        }
        return str;
      
      case 'mask':
        const maskStr = String(value);
        const visibleChars = args ? parseInt(args) : 4;
        if (maskStr.length > visibleChars) {
          return '*'.repeat(maskStr.length - visibleChars) + maskStr.slice(-visibleChars);
        }
        return maskStr;
      
      default:
        return value;
    }
  }

  formatDate(date, format) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('DD', day)
      .replace('MM', month)
      .replace('YYYY', year)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  validateTemplate(content, variables = {}) {
    const extracted = this.extractVariables(content);
    const errors = [];
    const warnings = [];

    // Check for required variables
    extracted.forEach(variable => {
      if (variable.required && !(variable.name in variables)) {
        errors.push(`Required variable '${variable.name}' is missing`);
      }
    });

    // Check for unused variables
    Object.keys(variables).forEach(key => {
      if (!extracted.find(v => v.name === key)) {
        warnings.push(`Variable '${key}' is provided but not used in template`);
      }
    });

    // Check for invalid formatters
    const formatterMatches = content.matchAll(this.formatterPattern);
    for (const match of formatterMatches) {
      const formatter = match[2];
      const validFormatters = ['uppercase', 'lowercase', 'capitalize', 'currency', 'date', 'number', 'truncate', 'mask'];
      if (!validFormatters.includes(formatter)) {
        errors.push(`Invalid formatter '${formatter}' for variable '${match[1]}'`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      requiredVariables: extracted.filter(v => v.required).map(v => v.name),
      optionalVariables: extracted.filter(v => !v.required).map(v => v.name)
    };
  }

  generateSampleData(variables) {
    const samples = {};
    
    variables.forEach(variable => {
      switch (variable.type) {
        case 'text':
          samples[variable.name] = `Sample ${variable.name}`;
          break;
        case 'number':
          samples[variable.name] = Math.floor(Math.random() * 1000);
          break;
        case 'boolean':
          samples[variable.name] = true;
          break;
        case 'array':
          samples[variable.name] = [
            { item: 'Item 1', value: 100 },
            { item: 'Item 2', value: 200 }
          ];
          break;
        case 'date':
          samples[variable.name] = new Date().toISOString();
          break;
        default:
          samples[variable.name] = `${variable.name} value`;
      }
    });

    return samples;
  }

  // Advanced template features
  processAdvancedTemplate(template, data) {
    let content = template.body_content;
    
    // Process includes (for template composition)
    content = this.processIncludes(content, data.includes || {});
    
    // Process custom functions
    content = this.processCustomFunctions(content, data.functions || {});
    
    // Process standard variables
    content = this.replaceVariables(content, data.variables || {});
    
    return content;
  }

  processIncludes(content, includes) {
    const includePattern = /{{>(\w+)}}/g;
    return content.replace(includePattern, (match, includeName) => {
      return includes[includeName] || match;
    });
  }

  processCustomFunctions(content, functions) {
    const functionPattern = /{{fn:(\w+)\(([^)]*)\)}}/g;
    return content.replace(functionPattern, (match, fnName, args) => {
      if (functions[fnName] && typeof functions[fnName] === 'function') {
        try {
          const argList = args.split(',').map(arg => arg.trim());
          return functions[fnName](...argList);
        } catch (error) {
          console.error(`Error executing function ${fnName}:`, error);
          return match;
        }
      }
      return match;
    });
  }
}

module.exports = new TemplateVariableProcessor();