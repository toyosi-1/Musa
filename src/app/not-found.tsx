export default function NotFound() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '1rem' 
    }}>
      <div style={{ 
        maxWidth: '32rem', 
        width: '100%', 
        textAlign: 'center' 
      }}>
        <h1 style={{ 
          fontSize: '4rem', 
          fontWeight: 'bold', 
          color: '#3b82f6', 
          marginBottom: '1rem' 
        }}>404</h1>
        <h2 style={{ 
          fontSize: '1.5rem', 
          fontWeight: 'bold', 
          marginBottom: '0.5rem' 
        }}>
          Page Not Found
        </h2>
        <p style={{ 
          color: '#6b7280', 
          marginBottom: '2rem' 
        }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <a 
          href="/" 
          style={{ 
            backgroundColor: '#3b82f6', 
            color: 'white', 
            padding: '0.5rem 1rem', 
            borderRadius: '0.25rem', 
            textDecoration: 'none', 
            display: 'inline-block', 
            fontWeight: '600' 
          }}
        >
          Go Back Home
        </a>
      </div>
    </div>
  );
}
