<template>
  <div class="admin-dashboard">
    <h1>Painel Administrativo</h1>
    
    <!-- Cards de estatísticas -->
    <div class="stats-grid">
      <div class="stat-card">
        <h3>Usuários Cadastrados</h3>
        <p class="stat-number">{{ stats.totalUsers }}</p>
      </div>
      
      <div class="stat-card">
        <h3>Etiquetas Geradas</h3>
        <p class="stat-number">{{ stats.totalLabels }}</p>
      </div>
      
      <div class="stat-card">
        <h3>Etiquetas Correios</h3>
        <p class="stat-number">{{ stats.labelsByCarrier?.correios || 0 }}</p>
      </div>
    </div>

    <!-- Configurações das Transportadoras -->
    <div class="carrier-settings">
      <h2>Configurações das Transportadoras</h2>
      
      <!-- Correios -->
      <div class="carrier-card">
        <h3>Correios</h3>
        <form @submit.prevent="saveCorreiosSettings">
          <div class="form-group">
            <label>Usuário API</label>
            <input 
              v-model="correiosSettings.apiUser" 
              type="text" 
              placeholder="Usuário fornecido pelos Correios"
              required
            />
          </div>
          
          <div class="form-group">
            <label>Senha API</label>
            <input 
              v-model="correiosSettings.apiPassword" 
              type="password" 
              placeholder="Senha da API"
              required
            />
          </div>
          
          <div class="form-group">
            <label>Número do Contrato</label>
            <input 
              v-model="correiosSettings.contractNumber" 
              type="text" 
              placeholder="Número do contrato com os Correios"
            />
          </div>
          
          <div class="form-group">
            <label>Cartão de Postagem</label>
            <input 
              v-model="correiosSettings.postageCard" 
              type="text" 
              placeholder="Número do cartão de postagem"
            />
          </div>
          
          <div class="form-group">
            <label>Código Administrativo</label>
            <input 
              v-model="correiosSettings.administrativeCode" 
              type="text" 
              placeholder="Código administrativo"
            />
          </div>
          
          <div class="form-group">
            <label>
              <input 
                v-model="correiosSettings.isActive" 
                type="checkbox"
              />
              Ativo
            </label>
          </div>
          
          <button type="submit" :disabled="saving">
            {{ saving ? 'Salvando...' : 'Salvar Configurações' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { API, graphqlOperation } from 'aws-amplify'
import { listUsers } from '@aws-amplify/auth'
import { listShippingLabels, listCarrierSettings } from '@/graphql/queries'
import { createCarrierSettings, updateCarrierSettings } from '@/graphql/mutations'

export default {
  name: 'AdminDashboard',
  setup() {
    const stats = ref({
      totalUsers: 0,
      totalLabels: 0,
      labelsByCarrier: {}
    })
    
    const correiosSettings = ref({
      apiUser: '',
      apiPassword: '',
      contractNumber: '',
      postageCard: '',
      administrativeCode: '',
      isActive: true
    })
    
    const correiosSettingsId = ref(null)
    const saving = ref(false)
    
    const loadStats = async () => {
      try {
        // Buscar total de etiquetas
        const labelsData = await API.graphql(
          graphqlOperation(listShippingLabels)
        )
        const labels = labelsData.data.listShippingLabels.items
        
        stats.value.totalLabels = labels.length
        
        // Contar por transportadora
        const carrierCount = {}
        labels.forEach(label => {
          carrierCount[label.carrier] = (carrierCount[label.carrier] || 0) + 1
        })
        stats.value.labelsByCarrier = carrierCount
        
        // TODO: Implementar contagem de usuários quando a API permitir
        // Por enquanto, você precisará usar o AWS Cognito SDK diretamente
        
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error)
      }
    }
    
    const loadCorreiosSettings = async () => {
      try {
        const settingsData = await API.graphql(
          graphqlOperation(listCarrierSettings, {
            filter: { carrierName: { eq: 'correios' } }
          })
        )
        
        const settings = settingsData.data.listCarrierSettings.items[0]
        if (settings) {
          correiosSettingsId.value = settings.id
          correiosSettings.value = {
            apiUser: settings.apiUser || '',
            apiPassword: settings.apiPassword || '',
            contractNumber: settings.contractNumber || '',
            postageCard: settings.postageCard || '',
            administrativeCode: settings.administrativeCode || '',
            isActive: settings.isActive !== false
          }
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error)
      }
    }
    
    const saveCorreiosSettings = async () => {
      saving.value = true
      try {
        const settingsData = {
          carrierName: 'correios',
          ...correiosSettings.value
        }
        
        if (correiosSettingsId.value) {
          // Atualizar
          await API.graphql(
            graphqlOperation(updateCarrierSettings, {
              input: {
                id: correiosSettingsId.value,
                ...settingsData
              }
            })
          )
        } else {
          // Criar novo
          const result = await API.graphql(
            graphqlOperation(createCarrierSettings, {
              input: settingsData
            })
          )
          correiosSettingsId.value = result.data.createCarrierSettings.id
        }
        
        alert('Configurações salvas com sucesso!')
      } catch (error) {
        console.error('Erro ao salvar configurações:', error)
        alert('Erro ao salvar configurações. Verifique os dados.')
      } finally {
        saving.value = false
      }
    }
    
    onMounted(() => {
      loadStats()
      loadCorreiosSettings()
    })
    
    return {
      stats,
      correiosSettings,
      saving,
      saveCorreiosSettings
    }
  }
}
</script>

<style scoped>
.admin-dashboard {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.stat-card {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
}

.stat-number {
  font-size: 2.5em;
  font-weight: bold;
  color: #333;
  margin: 10px 0;
}

.carrier-settings {
  margin-top: 40px;
}

.carrier-card {
  background: white;
  border: 1px solid #ddd;
  padding: 20px;
  border-radius: 8px;
  margin-top: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input[type="text"],
.form-group input[type="password"] {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button {
  background: #007bff;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>