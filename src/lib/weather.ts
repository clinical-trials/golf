import 'dotenv/config'
import { selectWeather } from '@/domain/weather/port'

export const weather = selectWeather(process.env)
