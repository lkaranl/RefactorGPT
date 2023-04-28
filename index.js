document.getElementById('repo-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const repoUrl = document.getElementById('repo-url').value.split('github.com/')[1];
  const apiUrl = `https://api.github.com/repos/${repoUrl}/contents`;
  const response = await fetch(apiUrl);
  const fileTree = await response.json();
  await displayFileTree(fileTree);
});

async function displayFileTree(fileTree, parentElement = null, indentLevel = 0) {
  if (!parentElement) {
    parentElement = document.getElementById('file-tree');
    parentElement.innerHTML = '';
  }

  for (const file of fileTree) {
    const fileElement = document.createElement('div');
    if (indentLevel > 0) {
      fileElement.classList.add('indent');
    }

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = file.name;
    checkbox.setAttribute('data-url', file.url);
    checkbox.setAttribute('data-type', file.type);

    const label = document.createElement('label');
    label.htmlFor = file.name;
    label.textContent = file.name;

    fileElement.appendChild(checkbox);
    fileElement.appendChild(label);

    if (file.type === 'dir') {
      const response = await fetch(file.url);
      const childFileTree = await response.json();
      await displayFileTree(childFileTree, fileElement, indentLevel + 1);
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
    if (checkbox.checked && checkbox.getAttribute('data-type') === 'file') {
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
  if (!apiKey) {
    alert('Please enter an API key.');
    return;
  }
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
  openaiResponseTextarea.value = completion.choices[0].message.content;

  sendToOpenAIButton.disabled = false;
  sendToOpenAIButton.textContent = 'Send to OpenAI';
});

async function fetchModels() {
  const apiKey = localStorage.getItem('openai-api-key') || document.getElementById('openai-key').value;
  if (!apiKey) {
    alert('Please enter an API key.');
    return;
  }

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
  // fetchModels();
}

document.getElementById('save-api-key').addEventListener('click', () => {
  const apiKey = document.getElementById('openai-key').value;
  localStorage.setItem('openai-api-key', apiKey);
  // fetchModels();
});