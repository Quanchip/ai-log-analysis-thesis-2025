pipeline {
  agent { label 'docker-agent'}

  stages {

      stage('Clean workspace') {
          steps {
              cleanWs()
          }
      }
    
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
          dockerImage.inside {
            sh '''
              python --version
              python -c "import sys; print('Python OK')"
            '''
          }
        }
      }
    }

    stage("SonarQube Analysis"){
      steps {
        script {
          withSonarQubeEnv(credentialsId: 'jenkins-sonarqube-token') {
          sh '''sonar-scanner \
                -Dsonar.projectKey=ai-log-analysis-thesis \
                -Dsonar.projectName="AI Log Analysis Thesis"      
            '''
          }
        }
      }
    }

    stage("Quality Gate"){
      steps {
        script {
          waitForQualityGate abortPipeline: true, credentialsId: 'jenkins-sonarqube-token'
        }
      }
    }
  }
}
