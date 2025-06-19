
import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect to login page by default. 
  // The (app) layout will handle redirection to /ordering if already logged in.
  redirect('/login');
}
