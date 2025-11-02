import React, { useState } from 'react';
import { Button, Form, Container, Row, Col, Spinner } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import './Login.scss';
const Login = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [userName, setUserName] = useState('');
    const [password, setPassword] = useState('');

    const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "demo-client-id";
    const REDIRECT_URI = process.env.REACT_APP_REDIRECT_URI || `${window.location.origin}/login`;

    const handleLogin = async (e) => {
        e.preventDefault();
    
        if (userName.trim() === '' || password.trim() === '') {
            toast.error('Please enter your username and password!');
            return;
        }
    
        const isEmail = userName.includes('@');
        if (!isEmail) {
            toast.error('Please enter a valid email address!');
            return;
        }
    
        setIsLoading(true);
    
        // Giả lập đăng nhập thành công
        setTimeout(() => {
            toast.success('Login successfully!');
            setIsLoading(false);
            navigate('/mappage'); // ✅ Điều hướng sang trang bản đồ
        }, 1000);
    };
    

    const handleGoogleLogin = () => {
        const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        const params = {
            response_type: 'code',
            client_id: GOOGLE_CLIENT_ID,
            redirect_uri: REDIRECT_URI,
            scope: 'openid profile email',
            access_type: 'offline',
            prompt: 'consent',
        };

        Object.keys(params).forEach(key =>
            googleAuthUrl.searchParams.append(key, params[key])
        );

        window.location.href = googleAuthUrl.toString();
    };

    return (
        <Container className="login-page">
            <Row>
                <Col md={6} className="login-image">
                    <img
                        src={require('../../assets/images/farm_img.jpg')}
                        alt="Farm Login"
                        className="img-fluid"
                        style={{ maxHeight: '400px' }}
                    />
                </Col>
                <Col md={6} className="login-form">
                    <div className="login-content">
                        <h1 className="farmtrace-brand">🌱 FarmTrace</h1>
                        <h4 className="text-center">Sign In To FarmTrace</h4>
                        <p className="text-center text-muted">Your Smart Agriculture Partner</p>

                        {isLoading && (
                            <div className="text-center">
                                <Spinner animation="border" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </Spinner>
                            </div>
                        )}

                        <div className="d-flex justify-content-center my-3">
                            <Button
                                variant="outline-primary"
                                onClick={handleGoogleLogin}
                                disabled={isLoading}
                                className="google-login-btn"
                            >
                                <img
                                    src={require('../../assets/images/google_icon.png')}
                                    className="me-2"
                                    alt="Google"
                                    width="20"
                                    height="20"
                                />
                                Sign in with Google
                            </Button>
                        </div>

                        <div className="text-center my-3 separator">-- OR --</div>

                        <Form onSubmit={handleLogin}>
                            <Form.Group className="mb-3" controlId="formEmail">
                                <Form.Label>Email Address</Form.Label>
                                <Form.Control
                                    type="email"
                                    placeholder="Enter your email address"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3" controlId="formPassword">
                                <Form.Label>Password</Form.Label>
                                <Form.Control
                                    type="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </Form.Group>
                            <Button
                                variant="dark"
                                type="submit"
                                className="w-100"
                                disabled={isLoading}
                            >
                                Sign In
                            </Button>
                        </Form>

                        <div className="text-center mt-3">
                            <Button
                                variant="outline-primary"
                                as={Link}
                                to="/register"
                                className="mb-2"
                            >
                                Register Now
                            </Button>
                            <br />
                            <Link
                                to="/forgot-password"
                                className="text-muted forgot-pass"
                            >
                                Forgot Password?
                            </Link>
                        </div>

                        <div className="text-center mt-5 text-muted">
                            <small>FarmTrace Terms & Conditions</small>
                        </div>
                    </div>
                </Col>
            </Row>
        </Container>
    );
};

export default Login;
