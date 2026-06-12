import './style.css';

import { ConfigurationLoader } from './config/ConfigurationLoader';
import { AppHost } from './app/bootstrap/AppHost';
import { Startup } from './app/bootstrap/Startup';

// Read configuration (appsettings.json + environment) once, up front.
const config = ConfigurationLoader.load(import.meta.env);

// Bootstrap the DOM, register services, then wire and start the app.
const elements = AppHost.mount(config.dom);
const services = Startup.configureServices(config, elements);
Startup.buildApp(services);
