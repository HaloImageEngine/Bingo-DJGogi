
import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  // Static flag to allow explicit logout
  private static isLoggedOut = false;

  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (AuthGuard.isLoggedOut) {
      // If explicitly logged out, require login
      localStorage.removeItem('authToken');
      localStorage.setItem('postLoginRedirect', state.url);
      this.router.navigate(['/login']);
      return false;
    }
    const token = localStorage.getItem('authToken');
    if (token) {
      return true;
    }
    // Store the attempted URL for redirect after login
    localStorage.setItem('postLoginRedirect', state.url);
    this.router.navigate(['/login']);
    return false;
  }

  // Call this to explicitly log out
  static logout(): void {
    AuthGuard.isLoggedOut = true;
    localStorage.removeItem('authToken');
  }
}
