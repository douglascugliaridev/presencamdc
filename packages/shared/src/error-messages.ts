export const CONNECTION_ERROR_MESSAGE =
  'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.'

export function statusFallbackMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Dados inválidos. Verifique as informações enviadas.'
    case 401:
      return 'Sessão expirada. Faça login novamente.'
    case 403:
      return 'Acesso negado.'
    case 404:
      return 'Não encontrado.'
    case 409:
      return 'Já existe um registro com os dados informados.'
    case 422:
      return 'Não foi possível processar os dados enviados.'
    case 429:
      return 'Muitas tentativas. Aguarde um momento e tente novamente.'
    default:
      return status >= 500
        ? 'Erro interno do servidor. Tente novamente em instantes.'
        : 'Não foi possível concluir a operação.'
  }
}

export function apiErrorMessage(status: number, bodyMessage: unknown): string {
  if (typeof bodyMessage === 'string' && bodyMessage.trim().length > 0) {
    return bodyMessage
  }
  if (Array.isArray(bodyMessage)) {
    const messages = bodyMessage.filter(
      (item): item is string => typeof item === 'string' && item.trim().length > 0,
    )
    if (messages.length > 0) {
      return messages.join('. ')
    }
  }
  return statusFallbackMessage(status)
}