
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class LoginComponent {
  login = '';
  password = '';
  error = '';

  constructor(private router: Router) {}

  onSubmit() {
    if (
      this.login === environment.defaultLogin &&
      this.password === environment.defaultPassword
    ) {
      this.error = '';
      // Set a fake token for demonstration
      localStorage.setItem('authToken', 'demo-token');
      // Redirect to the originally requested page if available
      const redirectUrl = localStorage.getItem('postLoginRedirect');
      localStorage.removeItem('postLoginRedirect');
      if (redirectUrl && redirectUrl !== '/login') {
        this.router.navigateByUrl(redirectUrl);
      } else {
        this.router.navigate(['/menu-listps']);
      }
    } else {
      this.error = 'Invalid login or password.';
      // Do not remove authToken; user stays logged in until explicit logout
    }
  }
}
