pipeline {
  agent { label 'docker-agent'}

  stages {
    
    stage('Checkout') {
      steps {
          git branch: 'main', credentialsId: 'github', url: 'https://github.com/Quanchip/ai-log-analysis-thesis-2025'
      }
    }
    
    stage("Build"){
      steps {
        script {
          dockerImage = docker.build(
              "python-backend:${env.BUILD_NUMBER}",
              "-f backend/Dockerfile backend"
          )
        }
      }
    }

    stage("Smoke test"){
      steps {
        script {
          dockerImages.inside {
            sh '''
              python --version
              python -c "import sys; print('Python OK')"
            '''
          }
        }
      }
    }
  }
}
