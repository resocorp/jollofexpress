import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to menu page
  redirect('/menu');
}
