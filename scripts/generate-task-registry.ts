import * as fs from 'fs';
import * as path from 'path';

const tasksDir = path.join(__dirname, '../src/tasks');
const automationFilePath = path.join(__dirname, '../src/core/_automation.ts');

const importMarkerStart = '// START: AUTO-GENERATED-TASK-IMPORTS';
const importMarkerEnd = '// END: AUTO-GENERATED-TASK-IMPORTS';
const registryMarkerStart = '// START: AUTO-GENERATED-TASK-REGISTRY';
const registryMarkerEnd = '// END: AUTO-GENERATED-TASK-REGISTRY';

// Regular expression to find 'export const type = "..."' and 'export async function run(...)'
const typeRegex = /export const type = ['"]([^'"]+)['"]/;

function generateRegistry() {
  const taskFiles = fs.readdirSync(tasksDir).filter(file => 
    file.startsWith('task') && file.endsWith('.ts') && !file.endsWith('.test.ts')
  );

  const imports: string[] = [];
  const registryEntries: string[] = [];

  for (const file of taskFiles) {
    const filePath = path.join(tasksDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const typeMatch = content.match(typeRegex);

    if (typeMatch) {
      const taskType = typeMatch[1];
      // Create a unique alias for the run function and type constant based on the task type
      const runAlias = `${taskType}Run`;
      const typeAlias = `${taskType}Type`;
      const taskFileName = path.basename(file, '.ts');

      imports.push(`import { run as ${runAlias}, type as ${typeAlias} } from '../tasks/${taskFileName}';`);
      registryEntries.push(`taskRegistry.set(${typeAlias}, ${runAlias});`);
    }
  }

  let automationFileContent = fs.readFileSync(automationFilePath, 'utf-8');

  // Replace imports
  const importRegex = new RegExp(`${importMarkerStart}[\s\S]*?${importMarkerEnd}`);
  const newImportBlock = `${importMarkerStart}\n${imports.join('\n')}\n${importMarkerEnd}`;
  automationFileContent = automationFileContent.replace(importRegex, newImportBlock);

  // Replace registry entries
  const registryRegex = new RegExp(`${registryMarkerStart}[\s\S]*?${registryMarkerEnd}`);
  const newRegistryBlock = `${registryMarkerStart}\n${registryEntries.join('\n')}\n${registryMarkerEnd}`;
  automationFileContent = automationFileContent.replace(registryRegex, newRegistryBlock);

  fs.writeFileSync(automationFilePath, automationFileContent, 'utf-8');

  console.log('✅ Task registry updated successfully.');
  console.log(`   - Found and registered ${taskFiles.length} tasks.`);
}

try {
  generateRegistry();
} catch (error) {
  console.error('❌ Error generating task registry:', error);
  process.exit(1);
}
