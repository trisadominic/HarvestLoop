import pandas as pd
import sys
import json
import os

try:
    # Get the directory where the script is running
    script_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(script_dir, 'updated_market_data.csv')

    # Read the data file
    df = pd.read_csv(file_path)

    # Get the product name from the command line arguments
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Product name not provided.'}))
        sys.exit(1)

    product_name = sys.argv[1]

    # Filter data for the specific product
    product_data = df[df['Product'].str.lower() == product_name.lower()]

    if product_data.empty:
        print(json.dumps({'error': f'No data found for product: {product_name}'}))
        sys.exit(1)

    # Calculate the average price
    average_price = product_data['Price'].mean()

    # Create a JSON object with the suggested price
    result = {
        'suggested_price': round(average_price, 2)
    }

    # Print the JSON object to standard output
    print(json.dumps(result))

except Exception as e:
    print(json.dumps({'error': str(e)}))
    sys.exit(1)