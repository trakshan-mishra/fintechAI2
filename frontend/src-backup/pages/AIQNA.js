import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import Header from '../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Sparkles, TrendingUp, Calculator, Shield, Landmark, CreditCard, HelpCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const categoryIcons = {
  sip: TrendingUp,
  tax: Calculator,
  investment: Landmark,
  insurance: Shield,
  retirement: Landmark,
  debt: CreditCard
};

const AIQNA = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, sessionToken } = useAuth();
  const [categories, setCategories] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [customQuestion, setCustomQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/sign-in');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/ai/qna/categories`);
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Fetch categories error:', error);
    }
  };

  const handleAskQuestion = async (category, question) => {
    setLoading(true);
    setAnswer(null);
    setSelectedCategory(category);
    
    try {
      const response = await axios.post(
        `${API_URL}/ai/qna/ask`,
        null,
        {
          params: { category, question },
          headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}
        }
      );
      
      setAnswer(response.data.answer);
    } catch (error) {
      console.error('Ask AI error:', error);
      toast.error('Failed to get answer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomQuestion = () => {
    if (!customQuestion.trim() || !selectedCategory) {
      toast.error('Please select a category and enter your question');
      return;
    }
    handleAskQuestion(selectedCategory, customQuestion);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AppLayout>
      <Header title="AI Financial Q&A" />

      {!answer ? (
        <>
          <div className="mb-8">
            <Card className="glass-strong border-l-4 border-l-primary">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Sparkles className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-lg mb-2">Ask AI Financial Questions</h3>
                    <p className="text-muted-foreground">
                      Get personalized financial advice powered by AI. Choose a category below or ask your own question.
                      Our AI considers your financial data to provide tailored recommendations.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {Object.entries(categories).map(([key, category]) => {
              const Icon = categoryIcons[key] || HelpCircle;
              return (
                <Card 
                  key={key} 
                  className="glass hover-lift cursor-pointer transition-all" 
                  onClick={() => setSelectedCategory(key)}
                  data-testid={`category-${key}`}
                >
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                      selectedCategory === key ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-xl">{category.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">{category.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {category.questions.slice(0, 3).map((q, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-left h-auto py-2 px-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAskQuestion(key, q);
                          }}
                          data-testid={`question-${key}-${idx}`}
                        >
                          <span className="text-xs line-clamp-2">{q}</span>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {selectedCategory && (
            <Card className="glass" data-testid="custom-question-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Ask Your Own Question
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder={`Ask a question about ${categories[selectedCategory]?.title}...`}
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCustomQuestion()}
                    data-testid="custom-question-input"
                  />
                  <Button 
                    onClick={handleCustomQuestion}
                    disabled={!customQuestion.trim()}
                    data-testid="ask-custom-question-button"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Ask AI
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Category: {categories[selectedCategory]?.title}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <div className="space-y-6">
          <Button
            variant="outline"
            onClick={() => {
              setAnswer(null);
              setCustomQuestion('');
            }}
            data-testid="back-to-categories-button"
          >
            ← Back to Categories
          </Button>

          {loading ? (
            <Card className="glass">
              <CardContent className="p-12 text-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Analyzing your question...</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="glass" data-testid="ai-answer-card">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <CardTitle>AI Answer</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground">
                  Category: {categories[selectedCategory]?.title}
                </p>
              </CardHeader>
              <CardContent>
                <div className="ai-answer-content">
                  <ReactMarkdown
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-4 mt-6" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-xl font-bold mb-3 mt-5" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-lg font-semibold mb-2 mt-4" {...props} />,
                      p: ({node, ...props}) => <p className="mb-4 leading-relaxed text-base" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4 space-y-2 ml-4" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-4 space-y-2 ml-4" {...props} />,
                      li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-bold text-primary" {...props} />,
                      em: ({node, ...props}) => <em className="italic" {...props} />,
                      blockquote: ({node, ...props}) => (
                        <blockquote className="border-l-4 border-primary pl-4 py-2 my-4 italic bg-primary/5 rounded-r" {...props} />
                      ),
                      code: ({node, inline, ...props}) => 
                        inline ? (
                          <code className="bg-primary/10 px-2 py-1 rounded text-sm font-mono" {...props} />
                        ) : (
                          <code className="block bg-primary/10 p-4 rounded-lg my-4 font-mono text-sm overflow-x-auto" {...props} />
                        ),
                    }}
                  >
                    {answer}
                  </ReactMarkdown>
                </div>
                
                <div className="mt-6 p-4 rounded-xl glass-strong text-sm text-muted-foreground">
                  ⚠️ <strong>Disclaimer:</strong> This is AI-generated financial advice and should not be considered as professional financial consultation. 
                  Always consult with a certified financial advisor before making important financial decisions.
                </div>

                <div className="mt-6 flex gap-2">
                  <Input
                    placeholder="Ask a follow-up question..."
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCustomQuestion()}
                    data-testid="followup-question-input"
                  />
                  <Button 
                    onClick={handleCustomQuestion}
                    disabled={!customQuestion.trim()}
                    data-testid="ask-followup-button"
                  >
                    Ask Follow-up
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </AppLayout>
  );
};

export default AIQNA;
