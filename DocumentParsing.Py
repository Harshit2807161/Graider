"""
Flask API for PDF and Text Parsing using LangChain
Features:
- PDF text extraction
- Text file parsing
- Metadata extraction
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import tempfile

# LangChain imports
from langchain_community.document_loaders import PyPDFLoader, TextLoader


app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = tempfile.gettempdir()
ALLOWED_EXTENSIONS = {'pdf', 'txt', 'text'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE


def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# ============================================================================
# PDF PARSING ENDPOINTS
# ============================================================================

@app.route('/pdf/extract-text', methods=['POST'])
def extract_pdf_text():
    """
    Extract text from PDF using LangChain PyPDFLoader.
    
    Returns:
        JSON with extracted text and metadata
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Only PDF and TXT files allowed'}), 400
        
        # Save file temporarily
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            # Load PDF with LangChain
            loader = PyPDFLoader(filepath)
            documents = loader.load()
            
            # Extract text and metadata
            result = {
                'filename': filename
            }
            
            
            # Get full text
            full_text = '\n\n'.join([doc.page_content for doc in documents])
            result['full_text'] = full_text
            
            return jsonify(result), 200
            
        finally:
            # Clean up
            if os.path.exists(filepath):
                os.remove(filepath)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================================
# TEXT PARSING ENDPOINTS
# ============================================================================

@app.route('/text/extract-text', methods=['POST'])
def parse_text_file():
    """
    Parse text file using LangChain TextLoader.
    
    Returns:
        JSON with parsed text and metadata
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            # Load text file
            loader = TextLoader(filepath, encoding='utf-8')
            documents = loader.load()
            
            result = {
                'filename': filename,
                'full_text': documents[0].page_content if documents else '',
            }
            
            return jsonify(result), 200
            
        finally:
            if os.path.exists(filepath):
                os.remove(filepath)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500



# ============================================================================
# UTILITY ENDPOINTS
# ============================================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'PDF and Text Parser API',
        'version': '1.0.0'
    }), 200


@app.route('/api/info', methods=['GET'])
def api_info():
    """Get API information and available endpoints."""
    endpoints = {
        'pdf_endpoints': {
            '/api/pdf/extract-text': {
                'method': 'POST',
                'description': 'Extract text from PDF using LangChain',
                'params': {'file': 'PDF file (required)'}
            }
        },
        'text_endpoints': {
            '/api/text/parse': {
                'method': 'POST',
                'description': 'Parse text file',
                'params': {'file': 'Text file (required)'}
            },
        },
        'utility_endpoints': {
            '/api/health': {
                'method': 'GET',
                'description': 'Health check'
            },
            '/api/info': {
                'method': 'GET',
                'description': 'API information'
            }
        }
    }
    
    return jsonify({
        'service': 'PDF and Text Parser API',
        'version': '1.0.0',
        'max_file_size': '50MB',
        'allowed_extensions': list(ALLOWED_EXTENSIONS),
        'endpoints': endpoints
    }), 200


@app.errorhandler(413)
def request_entity_too_large(error):
    """Handle file too large error."""
    return jsonify({'error': 'File too large. Maximum size is 50MB'}), 413


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors."""
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_server_error(error):
    """Handle 500 errors."""
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)