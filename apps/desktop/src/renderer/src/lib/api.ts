import type { ApiRequest } from '../../../shared/api'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
  }
}

export async function request<T>(input: ApiRequest): Promise<T> {
  const response = await window.noema.request(input)
  if (!response.ok) throw new ApiError(response.status, response.message)
  return response.data as T
}
