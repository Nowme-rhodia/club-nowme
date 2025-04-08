import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // Ici on pourrait envoyer l'erreur à un service de logging
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="mb-8">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Oups ! Une erreur est survenue
            </h1>
            <p className="text-gray-600 mb-8">
              Nous sommes désolés, mais quelque chose s'est mal passé. 
              Veuillez réessayer ou retourner à l'accueil.
            </p>
            <Link
              to="/"
              className="inline-flex items-center px-6 py-3 rounded-full bg-primary text-white hover:bg-primary-dark transition-colors"
            >
              <Home className="w-5 h-5 mr-2" />
              Retour à l'accueil
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}