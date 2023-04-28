const azureDevOps = require('azure-devops-node-api');
const PersonalAccessTokenCredentialHandler = require('azure-devops-node-api/handlers/PersonalAccessTokenCredentialHandler');

document.getElementById('repo-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const repoUrl = document.getElementById('repo-url').value.split('tfs.cassi.com.br/')[1];
  const tfsUrl = 'https://tfs.cassi.com.br/tfs/';
  const projectName = 'CASSICollection';
  const repoName = 'proponente-prestador-mvc-iis';

  const personalAccessToken = 'seu_token_de_acesso_pessoal';
  const authHandler = new BasicCredentialHandler("c00010789@cassi.com.br", "*Debiam@1293__");
  const connection = new azureDevOps.WebApi(tfsUrl, authHandler);
  const gitApi = await connection.getGitApi();
  const tree = await gitApi.getTree(projectName, repoName, 'HEAD', true, false, false);

  displayFileTree(tree, null, 0);
});

async function displayFileTree(tree, parentElement = null, indentLevel = 0) {
  if (!parentElement) {
    parentElement = document.getElementById('file-tree');
    parentElement.innerHTML = '';
  }

  for (const item of tree.treeEntries) {
    const fileElement = document.createElement('div');
    if (indentLevel > 0) {
      fileElement.classList.add('indent');
    }

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = item.relativePath;
    checkbox.setAttribute('data-url', item.url);
    checkbox.setAttribute('data-type', item.gitObjectType);

    const label = document.createElement('label');
    label.htmlFor = item.relativePath;
    label.textContent = item.relativePath;

    fileElement.appendChild(checkbox);
    fileElement.appendChild(label);

    if (item.gitObjectType === 'tree') {
      const childTree = await gitApi.getTree(projectName, repoName, item.objectId, true, false, false);
      await displayFileTree(childTree, fileElement, indentLevel + 1);
      checkbox.addEventListener('change', () => {
        const childCheckboxes = fileElement.querySelectorAll('input[type="checkbox"]');
        for (const childCheckbox of childCheckboxes) {
          childCheckbox.checked = checkbox.checked;
        }
        updateMergedFilesPreview();
      });
    } else {
      checkbox.addEventListener('change', updateMergedFilesPreview);
    }

    parentElement.appendChild(fileElement);
  }
}

async function updateMergedFilesPreview() {
  const checkboxes = document.querySelectorAll('#file-tree input[type="checkbox"]');
  const outputTextarea = document.getElementById('output');
  outputTextarea.value = '';

  for (const checkbox of checkboxes) {
    if (checkbox.checked && checkbox.getAttribute('data-type') === 'blob') {
      const fileUrl = checkbox.getAttribute('data-url');
      const response = await fetch(fileUrl);
      const fileContent = await response.json();
      const decodedContent = atob(fileContent.content);
      const fullPath = fileContent.path;
      outputTextarea.value += `######## ${fullPath}\n\n${decodedContent}\n\n`;
    }
  }
}

document.getElementById('save-api-key').addEventListener('click', () => {
  const apiKey = document.getElementById('openai-key').value;
  localStorage.setItem('openai-api-key', apiKey);
});


document.getElementById('send-to-openai').addEventListener('click', async () => {
    const apiKey = localStorage.getItem('openai-api-key') || document.getElementById('openai-key').value;
    const instruction = document.getElementById('instruction').value;
    const outputTextarea = document.getElementById('output');
    const openaiResponseTextarea = document.getElementById('openai-response');
    const model = document.getElementById('models').value;
    const temperature = parseFloat(document.getElementById('temperature').value);
    const maxTokens = parseInt(document.getElementById('max-tokens').value);
  
    const messages = outputTextarea.value.split('########').map(content => {
      return { role: "user", content: '######## ' + content };
    });
    messages.push({ role: "user", content: instruction });
  
    const sendToOpenAIButton = document.getElementById('send-to-openai');
    sendToOpenAIButton.disabled = true;
    sendToOpenAIButton.textContent = 'Loading...';
  
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: Number(temperature),
        max_tokens: Number(maxTokens),
      }),
    });
  
    const completion = await response.json();
    openaiResponseTextarea.value = completion.choices[0].text;
  
    sendToOpenAIButton.disabled = false;
    sendToOpenAIButton.textContent = 'Send to OpenAI';
  });
  
  async function fetchModels() {
    const apiKey = localStorage.getItem('openai-api-key') || document.getElementById('openai-key').value;
  
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
  
    const models = await response.json();
    populateModelDropdown(models.data);
  }
  
  function populateModelDropdown(models) {
    const modelSelect = document.getElementById('models');
    for (const model of models) {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = model.id;
      modelSelect.appendChild(option);
    }
  }
  
  // Load saved API key from localStorage
  const savedApiKey = localStorage.getItem('openai-api-key');
  if (savedApiKey) {
    document.getElementById('openai-key').value = savedApiKey;
    fetchModels();
  }
  
  document.getElementById('save-api-key').addEventListener('click', () => {
    const apiKey = document.getElementById('openai-key').value;
    localStorage.setItem('openai-api-key', apiKey);
    fetchModels();
  });
  