import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { LoginPage } from '../pages/LoginPage';

describe('LoginPage Component', () => {
  it('renders branding and login fields', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </BrowserRouter>
    );

    const comandaMatches = screen.getAllByText(/Comanda/i);
    expect(comandaMatches.length).toBeGreaterThan(0);

    const proMatches = screen.getAllByText(/PRO/i);
    expect(proMatches.length).toBeGreaterThan(0);

    expect(screen.getByPlaceholderText(/Ex: admin ou operador/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Acessar Terminal/i })).toBeInTheDocument();
  });

  it('fills inputs when quick demo buttons are clicked', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </BrowserRouter>
    );

    const adminBtn = screen.getByText(/Gerente \/ Admin/i);
    fireEvent.click(adminBtn);

    const userInput = screen.getByPlaceholderText(/Ex: admin ou operador/i) as HTMLInputElement;
    expect(userInput.value).toBe('admin');

    const passInput = screen.getByPlaceholderText(/••••••••/i) as HTMLInputElement;
    expect(passInput.value).toBe('Admin@Comandas2026!');
  });
});
