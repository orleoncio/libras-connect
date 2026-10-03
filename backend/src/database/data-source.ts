import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { databaseOptions, validateEnvironment } from './config.js';
config();
export default new DataSource(
  databaseOptions(validateEnvironment(process.env)),
);
