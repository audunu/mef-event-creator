import { Link } from 'react-router-dom';
import { MEFLogo } from '@/components/MEFLogo';
import { Button } from '@/components/ui/button';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
      <div className="text-center max-w-2xl">
        <MEFLogo className="h-20 mb-8 mx-auto" />
        <h1 className="text-4xl font-bold mb-4">MEF Event App Generator</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Administrer arrangementer for Maskinentreprenørenes Forbund
        </p>
        <Link to="/admin/login">
          <Button size="lg" className="text-lg px-8">
            Logg inn som admin
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Index;
