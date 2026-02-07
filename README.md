# Route

A simple routing web application built with Node.js and Express.

## Features

- Simple web interface
- Health check API endpoint
- Info API endpoint
- Ready for deployment on multiple platforms

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Start the application:
```bash
npm start
```

3. Open your browser and navigate to `http://localhost:3000`

## Deployment

This application is ready to be deployed on multiple platforms:

### Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

Or connect your GitHub repository to Vercel for automatic deployments.

### Render

1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repository
3. Render will automatically detect the `render.yaml` configuration

### Railway

1. Install Railway CLI or use the web interface
2. Run:
```bash
railway init
railway up
```

### Heroku

1. Install Heroku CLI
2. Login and create a new app:
```bash
heroku login
heroku create your-app-name
```

3. Deploy:
```bash
git push heroku main
```

The `Procfile` is already configured for Heroku deployment.

## API Endpoints

- `GET /` - Main application page
- `GET /api/health` - Health check endpoint
- `GET /api/info` - Application information

## Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode (development/production)

## License

MIT