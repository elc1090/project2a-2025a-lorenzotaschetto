const gitHubForm = document.getElementById('gitHubForm');
const submitText = document.getElementById('submitText');
const loadingSpinner = document.getElementById('loadingSpinner');
const resultsSection = document.getElementById('resultsSection');

gitHubForm.addEventListener('submit', (e) => {
    e.preventDefault();

    submitText.textContent = 'Buscando...';
    loadingSpinner.style.display = 'inline-block';
    resultsSection.classList.add('d-none');

    let gitHubUsername = document.getElementById('usernameInput').value;
    let githubRepository = document.getElementById('repositoryInput').value;

    document.getElementById('userRepos').innerHTML = '';

    if (!githubRepository) {
        requestUserRepos(gitHubUsername)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Usuário não encontrado');
                }
                return response.json();
            })
            .then(data => {
                displayRepos(data, gitHubUsername);
                resultsSection.classList.remove('d-none');
            })
            .catch(error => {
                displayError(error.message, gitHubUsername);
            })
            .finally(() => {
                resetLoadingState();
            });
    } else {
        requestSpecificRepo(gitHubUsername, githubRepository)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Repositório não encontrado');
                }
                return response.json();
            })
            .then(data => {
                displayRepos([data], gitHubUsername);
                resultsSection.classList.remove('d-none');
            })
            .catch(error => {
                displayError(error.message, gitHubUsername);
            })
            .finally(() => {
                resetLoadingState();
            });
    }
});

function displayRepos(repos, username) {
    let container = document.getElementById('userRepos');
    container.innerHTML = '';

    if (repos.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="repo-card p-4 text-center">
                    <i class="fas fa-folder-open fa-3x mb-3" style="color: var(--accent-color);"></i>
                    <h4>Nenhum repositório encontrado</h4>
                    <p class="mb-0">${username} não possui repositórios públicos</p>
                </div>
            </div>
        `;
    } else {
        repos.forEach(repo => {
            const languageColor = repo.language ? getLanguageColor(repo.language) : '#ccc';
            
            const repoCard = document.createElement('div');
            repoCard.className = 'col-md-6';
            repoCard.innerHTML = `
                <div class="repo-card h-100 p-4">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <h4 class="mb-0">
                            <a href="${repo.html_url}" target="_blank" class="text-decoration-none" style="color: var(--secondary-color);">
                                ${repo.name}
                            </a>
                        </h4>
                        <span class="badge rounded-pill" style="background-color: var(--primary-color);">
                            <i class="fas fa-star me-1"></i> ${repo.stargazers_count}
                        </span>
                    </div>
                    
                    <p class="text-muted mb-3">${repo.description || 'Sem descrição'}</p>
                    
                    <div class="d-flex flex-wrap gap-3">
                        ${repo.language ? `
                            <span class="d-flex align-items-center">
                                <span class="repo-language" style="background-color: ${languageColor};"></span>
                                ${repo.language}
                            </span>
                        ` : ''}
                        
                        <span class="d-flex align-items-center">
                            <i class="fas fa-code-branch me-2"></i>
                            ${repo.forks_count} forks
                        </span>
                        
                        ${repo.license ? `
                            <span class="d-flex align-items-center">
                                <i class="fas fa-balance-scale me-2"></i>
                                ${repo.license.spdx_id}
                            </span>
                        ` : ''}
                    </div>
                    
                    <div class="mt-3">
                        <small class="text-muted">
                            Atualizado em ${new Date(repo.updated_at).toLocaleDateString()}
                        </small>
                    </div>
                    
                    <button class="btn btn-sm btn-outline-secondary mt-3 show-commits-btn" 
                            data-repo="${repo.name}" 
                            data-owner="${username}">
                        <i class="fas fa-history me-1"></i> Mostrar Commits
                    </button>
                    
                    <div class="commits-container mt-3" id="commits-${repo.name}" style="display: none;"></div>
                </div>
            `;
            container.appendChild(repoCard);
        });

        document.querySelectorAll('.show-commits-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const repo = this.getAttribute('data-repo');
                const owner = this.getAttribute('data-owner');
                const commitsContainer = document.getElementById(`commits-${repo}`);
                
                if (commitsContainer.style.display === 'none') {
                    this.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Carregando...';
                    
                    if (commitsContainer.innerHTML === '') {
                        fetchCommits(owner, repo)
                            .then(commits => {
                                displayCommits(commits, repo);
                                this.innerHTML = '<i class="fas fa-eye-slash me-1"></i> Ocultar Commits';
                                commitsContainer.style.display = 'block';
                            })
                            .catch(error => {
                                commitsContainer.innerHTML = `
                                    <div class="alert alert-danger">
                                        Erro ao carregar commits: ${error.message}
                                    </div>
                                `;
                                this.innerHTML = '<i class="fas fa-history me-1"></i> Mostrar Commits';
                            });
                    } else {
                        commitsContainer.style.display = 'block';
                        this.innerHTML = '<i class="fas fa-eye-slash me-1"></i> Ocultar Commits';
                    }
                } else {
                    commitsContainer.style.display = 'none';
                    this.innerHTML = '<i class="fas fa-history me-1"></i> Mostrar Commits';
                }
            });
        });
    }
}

function fetchCommits(owner, repo) {
    return fetch(`https://api.github.com/repos/${owner}/${repo}/commits`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Não foi possível obter os commits');
            }
            return response.json();
        });
}

function displayCommits(commits, repoName) {
    const container = document.getElementById(`commits-${repoName}`);
    
    if (!commits || commits.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                Nenhum commit encontrado neste repositório.
            </div>
        `;
        return;
    }
    
    let commitsHTML = `
        <div class="commits-list">
            <h5 class="mb-3"><i class="fas fa-code-commit"></i> Últimos ${commits.length} commits</h5>
            <div class="list-group">
    `;
    
    commits.slice(0, 5).forEach(commit => {
        if (!commit.commit) return;
        
        const commitDate = commit.commit.author?.date 
            ? new Date(commit.commit.author.date) 
            : new Date();
        const formattedDate = commitDate.toLocaleString();
        const authorName = commit.commit.author?.name || 'Autor desconhecido';
        const messageFirstLine = commit.commit.message.split('\n')[0] || 'Sem mensagem';
        const messageRest = commit.commit.message.split('\n').slice(1).join(' ').substring(0, 100);
        const sha = commit.sha ? commit.sha.substring(0, 7) : '';

        commitsHTML += `
            <div class="list-group-item commit-item">
                <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1">${messageFirstLine}</h6>
                    <small>${formattedDate}</small>
                </div>
                ${messageRest ? `<p class="mb-1 small text-muted">${messageRest}</p>` : ''}
                <small class="text-muted">
                    <i class="fas fa-user"></i> ${authorName}
                    ${sha ? `<span class="ms-2"><i class="fas fa-code-branch"></i> ${sha}</span>` : ''}
                </small>
            </div>
        `;
    });
    
    const repoPath = `${document.querySelector(`button[data-repo="${repoName}"]`).getAttribute('data-owner')}/${repoName}`;
    
    commitsHTML += `
            </div>
            <a href="https://github.com/${repoPath}/commits" 
               target="_blank" 
               class="btn btn-sm btn-link mt-2">
                Ver todos os commits
            </a>
        </div>
    `;
    
    container.innerHTML = commitsHTML;
}

function displayError(message, username) {
    let container = document.getElementById('userRepos');
    container.innerHTML = `
        <div class="col-12">
            <div class="repo-card p-4 text-center">
                <i class="fas fa-exclamation-triangle fa-3x mb-3" style="color: var(--accent-color);"></i>
                <h4>Erro na busca</h4>
                <p class="mb-0">${message}: ${username}</p>
            </div>
        </div>
    `;
    resultsSection.classList.remove('d-none');
}

function resetLoadingState() {
    submitText.textContent = 'Buscar';
    loadingSpinner.style.display = 'none';
}

function requestUserRepos(username) {
    return fetch(`https://api.github.com/users/${username}/repos`);
}

function requestSpecificRepo(username, repo) {
    return fetch(`https://api.github.com/repos/${username}/${repo}`);
}

function getLanguageColor(language) {
    const colors = {
        'JavaScript': '#f1e05a',
        'Python': '#3572A5',
        'Java': '#b07219',
        'TypeScript': '#3178c6',
        'C++': '#f34b7d',
        'Ruby': '#701516',
        'PHP': '#4F5D95',
        'CSS': '#563d7c',
        'HTML': '#e34c26',
        'Go': '#00ADD8',
        'Swift': '#ffac45',
        'Kotlin': '#A97BFF'
    };
    
    return colors[language] || '#ccc';
}