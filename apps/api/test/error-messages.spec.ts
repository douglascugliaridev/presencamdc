import {
  apiErrorMessage,
  CONNECTION_ERROR_MESSAGE,
  statusFallbackMessage,
} from '@presencamdc/shared'

describe('error-messages (compartilhado web/mobile)', () => {
  describe('statusFallbackMessage', () => {
    it('retorna mensagem PT para cada status comum', () => {
      expect(statusFallbackMessage(400)).toContain('Dados inválidos')
      expect(statusFallbackMessage(401)).toContain('Faça login novamente')
      expect(statusFallbackMessage(403)).toContain('Acesso negado')
      expect(statusFallbackMessage(404)).toContain('Não encontrado')
      expect(statusFallbackMessage(409)).toContain('registro')
      expect(statusFallbackMessage(429)).toContain('Muitas tentativas')
    })

    it('retorna mensagem de servidor para 5xx', () => {
      expect(statusFallbackMessage(500)).toContain('Erro interno do servidor')
      expect(statusFallbackMessage(503)).toContain('Erro interno do servidor')
    })

    it('retorna mensagem genérica para outros códigos', () => {
      expect(statusFallbackMessage(418)).toContain('Não foi possível concluir')
    })
  })

  describe('apiErrorMessage', () => {
    it('prioriza a mensagem do backend quando presente', () => {
      expect(apiErrorMessage(403, 'Você está bloqueado por faltas e não pode marcar presença')).toBe(
        'Você está bloqueado por faltas e não pode marcar presença',
      )
    })

    it('junta mensagens de validação em array', () => {
      const result = apiErrorMessage(400, ['Latitude inválida', 'Longitude inválida'])
      expect(result).toBe('Latitude inválida. Longitude inválida')
    })

    it('ignora mensagens vazias/não-string no array', () => {
      expect(apiErrorMessage(400, ['', 123, 'Nome inválido'])).toBe('Nome inválido')
    })

    it('usa fallback por status quando o corpo não tem mensagem', () => {
      expect(apiErrorMessage(500, undefined)).toContain('Erro interno do servidor')
      expect(apiErrorMessage(429, null)).toContain('Muitas tentativas')
    })
  })

  it('expõe mensagem de falha de conexão', () => {
    expect(CONNECTION_ERROR_MESSAGE).toContain('Não foi possível conectar ao servidor')
  })
})