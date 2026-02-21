import { FlixorCore } from '@flixor/core';
import { TizenStorage, TizenSecureStorage, TizenCache } from './storage';

// In a real app, these would come from environment variables or a config file
const CONFIG = {
  clientId: 'FlixorTizen-' + Math.random().toString(36).substring(7),
  productName: 'Flixor Tizen',
  productVersion: '1.0.0',
  platform: 'Tizen TV',
  deviceName: 'Samsung Smart TV',
  tmdbApiKey: 'db55323b8d3e4154498498a75642b381',
  traktClientId: '4ab0ead6d5510bf39180a5e1dd7b452f5ad700b7794564befdd6bca56e0f7ce4',
  traktClientSecret: '', 
};

export const flixor = new FlixorCore({
  ...CONFIG,
  storage: new TizenStorage(),
  secureStorage: new TizenSecureStorage(),
  cache: new TizenCache(),
});
