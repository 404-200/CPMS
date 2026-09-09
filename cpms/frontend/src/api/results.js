import client from './client'

export const getBiweeklyResults = (periodId) => client.get(`/api/results/biweekly/${periodId}`)

export const getMonthlyResults = (periodId) => client.get(`/api/results/monthly/${periodId}`)
