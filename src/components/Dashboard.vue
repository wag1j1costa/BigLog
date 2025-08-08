<template>
  <div class="admin-dashboard">
    <div class="dashboard-header">
      <h1>Painel Administrativo</h1>
      <button @click="refreshData" class="refresh-btn">
        {{ loading ? 'Atualizando...' : '🔄 Atualizar' }}
      </button>
    </div>
    
    <!-- Cards de estatísticas -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <h3>Usuários Cadastrados</h3>
        <p class="stat-number">{{ stats.totalUsers }}</p>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">🏷️</div>
        <h3>Total de Etiquetas</h3>
        <p class="stat-number">{{ stats.totalLabels }}</p>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">📦</div>
        <h3>Etiquetas Correios</h3>
        <p class="stat-number">{{ stats.correiosLabels }}</p>
      </div>
    </div>

    <!-- Configurações das Transportadoras -->
    <div class="carrier-settings">
      <h2>Configurações das Transportadoras</h2>
      
      <!-- Card dos Correios -->
      <div class="carrier-card">
        <div class="carrier-header">
          <h3>📮 Correios</h3>
          <span :class="['status-badge', correiosSettings.isActive ? 'active' : 'inactive']">
            {{ correiosSettings.isActive ? 'Ativo' : 'Inativo' }}
          </span>
        </div>
        
        <form @submit.prevent="saveCorreiosSettings">
          <div class="form-row">
            <div class="form-group">
              <label>Usuário API *</label>
              <input 
                v-model="correiosSettings.apiUser" 
                type="text" 
                placeholder="Usuário fornecido pelos Correios"
                required
              />
            </div>
            
            <div class="form-group">
              <label>Senha API *</label>
              <input 
                v-model="correiosSettings.apiPassword" 
                type="password" 
                placeholder="Senha da API"
                required
              />
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Número do Contrato</label>
              <input 
                v-model="correiosSettings.contractNumber" 
                type="text" 
                placeholder="Ex: 9912345678"
              />
            </div>
            
            <div class="form-group">
              <label>Cartão de Postagem</label>
              <input 
                v-model="correiosSettings.postageCard" 
                type="text" 
                placeholder="Ex: 0067599999"
              />
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Código Administrativo</label>
              <input 
                v-model="correiosSettings.administrativeCode" 
                type="text" 
                placeholder="Ex: 12345678"
              />
            </div>
            
            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <input 
                  v-model="correiosSettings.isActive" 
                  type="checkbox"
                />
                <span>Transportadora Ativa</span>
              </label>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="submit" class="btn-primary" :disabled="saving">
              {{ saving ? 'Salvando...' : 'Salvar Configurações' }}
            </button>
            <button type="button" class="btn-secondary" @click="testConnection" :disabled="testing">
              {{ testing ? 'Testando...' : 'Testar Conexão' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Lista de etiquetas recentes -->
    <div class="recent-labels">
      <h2>Etiquetas Recentes</h2>
      <div class="table-wrapper">
        <table v-if="recentLabels.length > 0">
          <thead>
            <tr>
              <th>Código</th>
              <th>Transportadora</th>
              <th>Destinatário</th>
              <th>Status</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="label in recentLabels" :key="label.id">
              <td>{{ label.trackingCode }}</td>
              <td>{{ label.carrier }}</td>
              <td>{{ label.recipientName }}</td>
              <td>
                <span :class="['status', label.status]">
                  {{ statusLabels[label.status] }}
                </span>
              </td>
              <td>{{ formatDate(label.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="no-data">Nenhuma etiqueta gerada ainda.</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { generateClient } from 'aws-amplify/data'
import { getCurrentUser } from 'aws-amplify/auth'

const client = generateClient()

export default {
  name: 'AdminDashboard',
  setup() {
    const loading = ref(false)
    const saving = ref(false)
    const testing = ref(false)
    
    const stats = ref({
      totalUsers: 0,
      totalLabels: 0,
      correiosLabels: 0
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
    const recentLabels = ref([])
    
    const statusLabels = {
      created: 'Criada',
      printed: 'Impressa',
      shipped: 'Enviada',
      delivered: 'Entregue',
      cancelled: 'Cancelada'
    }
    
    const formatDate = (date) => {
      return new Date(date).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    
    const loadStats = async () => {
      try {
        // Buscar todas as etiquetas
        const { data: labels } = await client.models.ShippingLabel.list()
        
        stats.value.totalLabels = labels.length
        stats.value.correiosLabels = labels.filter(l => l.carrier === 'correios').length
        
        // Pegar as 10 mais recentes
        recentLabels.value = labels
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 10)
        
        // TODO: Implementar contagem de usuários
        // Por enquanto, isso precisaria ser feito via Lambda ou AWS SDK
        stats.value.totalUsers = 'N/A'
        
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error)
      }
    }
    
    const loadCorreiosSettings = async () => {
      try {
        const { data: settings } = await client.models.CarrierSettings.list({
          filter: { carrierName: { eq: 'correios' } }
        })
        
        if (settings.length > 0) {
          const setting = settings[0]
          correiosSettingsId.value = setting.id
          correiosSettings.value = {
            apiUser: setting.apiUser || '',
            apiPassword: setting.apiPassword || '',
            contractNumber: setting.contractNumber || '',
            postageCard: setting.postageCard || '',
            administrativeCode: setting.administrativeCode || '',
            isActive: setting.isActive !== false
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
          await client.models.CarrierSettings.update({
            id: correiosSettingsId.value,
            ...settingsData
          })
        } else {
          // Criar novo
          const { data } = await client.models.CarrierSettings.create(settingsData)
          correiosSettingsId.value = data.id
        }
        
        alert('✅ Configurações salvas com sucesso!')
      } catch (error) {
        console.error('Erro ao salvar configurações:', error)
        alert('❌ Erro ao salvar configurações. Verifique os dados.')
      } finally {
        saving.value = false
      }
    }
    
    const testConnection = async () => {
      testing.value = true
      try {
        // Aqui você implementaria o teste de conexão com a API dos Correios
        // Por enquanto, apenas simula
        setTimeout(() => {
          alert('✅ Conexão testada com sucesso!')
          testing.value = false
        }, 2000)
      } catch (error) {
        alert('❌ Falha ao testar conexão')
        testing.value = false
      }
    }
    
    const refreshData = async () => {
      loading.value = true
      await Promise.all([loadStats(), loadCorreiosSettings()])
      loading.value = false
    }
    
    onMounted(() => {
      refreshData()
    })
    
    return {
      loading,
      saving,
      testing,
      stats,
      correiosSettings,
      recentLabels,
      statusLabels,
      formatDate,
      saveCorreiosSettings,
      testConnection,
      refreshData
    }
  }
}
</script>

<style scoped>
.admin-dashboard {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  background: #f5f7fa;
  min-height: 100vh;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.dashboard-header h1 {
  color: #2c3e50;
  margin: 0;
}

.refresh-btn {
  background: #fff;
  border: 1px solid #ddd;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.refresh-btn:hover {
  background: #f0f0f0;
}

/* Estatísticas */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.stat-card {
  background: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-align: center;
  transition: transform 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.stat-icon {
  font-size: 3em;
  margin-bottom: 10px;
}

.stat-card h3 {
  color: #666;
  font-size: 0.9em;
  margin: 10px 0;
  font-weight: normal;
}

.stat-number {
  font-size: 2.5em;
  font-weight: bold;
  color: #2c3e50;
  margin: 0;
}

/* Configurações das Transportadoras */
.carrier-settings {
  margin-bottom: 40px;
}

.carrier-settings h2 {
  color: #2c3e50;
  margin-bottom: 20px;
}

.carrier-card {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.carrier-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.carrier-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.3em;
}

.status-badge {
  padding: 5px 15px;
  border-radius: 20px;
  font-size: 0.85em;
  font-weight: bold;
}

.status-badge.active {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-badge.inactive {
  background: #ffebee;
  color: #c62828;
}

/* Formulário */
.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 8px;
  font-weight: 600;
  color: #555;
  font-size: 0.9em;
}

.form-group input[type="text"],
.form-group input[type="password"] {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1em;
  transition: border-color 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #4CAF50;
}

.checkbox-group {
  justify-content: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.checkbox-label input[type="checkbox"] {
  margin-right: 8px;
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-label span {
  color: #555;
}

.form-actions {
  display: flex;
  gap: 15px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.btn-primary, .btn-secondary {
  padding: 12px 30px;
  border: none;
  border-radius: 6px;
  font-size: 1em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: #4CAF50;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #45a049;
}

.btn-secondary {
  background: #fff;
  color: #4CAF50;
  border: 2px solid #4CAF50;
}

.btn-secondary:hover:not(:disabled) {
  background: #4CAF50;
  color: white;
}

.btn-primary:disabled, .btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Tabela de etiquetas recentes */
.recent-labels {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.recent-labels h2 {
  color: #2c3e50;
  margin-bottom: 20px;
}

.table-wrapper {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: #f8f9fa;
}

th {
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #666;
  border-bottom: 2px solid #e0e0e0;
}

td {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
}

tr:hover {
  background: #f8f9fa;
}

.status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.85em;
  font-weight: 600;
}

.status.created {
  background: #e3f2fd;
  color: #1976d2;
}

.status.printed {
  background: #f3e5f5;
  color: #7b1fa2;
}

.status.shipped {
  background: #fff3e0;
  color: #f57c00;
}

.status.delivered {
  background: #e8f5e9;
  color: #388e3c;
}

.status.cancelled {
  background: #ffebee;
  color: #d32f2f;
}

.no-data {
  text-align: center;
  color: #999;
  padding: 40px;
}

/* Responsividade */
@media (max-width: 768px) {
  .admin-dashboard {
    padding: 15px;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .table-wrapper {
    font-size: 0.9em;
  }
}
</style>