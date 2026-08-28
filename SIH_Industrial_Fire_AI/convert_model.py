import joblib
import numpy as np
from skl2onnx import to_onnx
from skl2onnx.common.data_types import FloatTensorType

# Load the model
model = joblib.load("industrial_fire_model_final.joblib")

# Define initial types for the 8 features
initial_type = [('float_input', FloatTensorType([None, 8]))]

# Convert the model with ZipMap disabled to get raw tensor outputs for probabilities
onx = to_onnx(
    model, 
    initial_types=initial_type, 
    target_opset=12,
    options={'zipmap': False}
)

# Save the ONNX model
with open("industrial_fire_model_final.onnx", "wb") as f:
    f.write(onx.SerializeToString())

print("Model successfully converted to ONNX with zipmap disabled!")
