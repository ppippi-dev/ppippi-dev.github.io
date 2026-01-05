---
description: A Practical Guide to Triton Inference Server, from Installation to Operation
heroImage: /img/2025-05-16/0.webp
pubDate: '2025-05-16'
tags:
- MLOps
title: Building an Nvidia Triton Inference Server
---

While developing AI models is important, reliably deploying and operating them in a real service environment is also crucial.

NVIDIA's Triton Inference Server is a powerful tool designed to address these challenges. Triton supports various AI frameworks and provides high performance and throughput, making the model inference process highly efficient.

In this article, we will explore the key advantages of Triton Inference Server and provide a step-by-step guide to deploying and testing a real model. We will also cover how to make requests using curl and discuss operational considerations, making it easy for beginners to follow along.

### What is Triton Inference Server?

First, let's take a closer look at Triton Inference Server.

NVIDIA Triton Inference Server is an open-source inference server designed for easy and efficient deployment and execution of various deep learning and machine learning models. It supports models trained with multiple frameworks like TensorFlow, PyTorch, ONNX, and TensorRT on various hardware including GPUs and CPUs. It standardizes the deployment of AI models in production environments and provides scalability.

### Exploring the Powerful Advantages of Triton Inference Server

Triton Inference Server offers the following powerful advantages when deploying and operating AI models in a production environment:

-   **Framework Agility / Interoperability**: It supports most of the widely used deep learning frameworks today, including TensorFlow, PyTorch, ONNX, TensorRT, and OpenVINO. The ability to flexibly manage and deploy models without being tied to a specific framework is a major advantage.
-   **High Performance & Throughput**:
    -   **GPU and CPU Optimization**: It is optimized to maximize the performance of NVIDIA GPUs and also supports efficient inference in CPU environments.
    -   **Dynamic Batching**: It automatically batches incoming requests to maximize inference throughput, which is much more efficient than processing individual requests one by one.
    -   **Model Analyzer**: It provides a tool that automatically finds the optimal performance configuration based on the model's batch size and number of instances, saving the effort of manually finding optimization settings.
    -   **Concurrent Model Execution**: It can run multiple models or multiple instances of the same model simultaneously. For example, you can load and process requests for several different types of models on a single GPU, or you can have multiple instances of a popular model to increase parallel processing performance. This helps to maximize system resource utilization.
    -   **Model Ensembling**: It supports ensembling multiple models to improve performance.
    -   **Streaming Audio/Video Input Support**: It supports streaming audio/video as input for models.
-   **Cloud-Native Architecture Support**:
    -   It integrates well with container orchestration platforms like Kubernetes and Docker Swarm, enabling scalable and easy-to-manage service deployment.
    -   **Stateless Architecture**: The Triton server itself is stateless, which facilitates horizontal scaling and ensures service continuity by quickly replacing failed instances with new ones.
-   **Support for Various Protocols and Inference Modes**:
    -   It supports standard protocols like HTTP/REST and gRPC, making it easy to integrate with various client environments.
    -   It supports both real-time streaming inference and batch inference to meet diverse service requirements.
-   **Ease of Monitoring and Management**:
    -   It provides various metrics such as GPU utilization, memory usage, inference throughput, and latency in a standardized format for easy monitoring in Prometheus. This allows for real-time tracking of the status of running models and quick diagnosis of problems.

### Hands-on with Triton Inference Server: From Installation to Testing

Now, let's walk through the process of installing Triton Inference Server, deploying a model, and testing it.

**References**

For more detailed information, please refer to the official documentation and repositories below.

-   Triton Server Container (NVIDIA NGC): [https://catalog.ngc.nvidia.com/orgs/nvidia/containers/tritonserver](https://catalog.ngc.nvidia.com/orgs/nvidia/containers/tritonserver)
-   Triton Server GitHub Repository: [https://github.com/triton-inference-server/server](https://github.com/triton-inference-server/server)
-   Triton Tutorials GitHub Repository: [https://github.com/triton-inference-server/tutorials](https://github.com/triton-inference-server/tutorials)
    -   In the tutorial repository, you can find examples of downloading and using models from various frameworks like PyTorch.

If you want to refer to the code used, please check the repository below.

- [https://github.com/ppippi-dev/triton_inference_server_test](https://github.com/ppippi-dev/triton_inference_server_test)

**1. Triton Server Setup: Model Repository Configuration**

Triton uses a model repository with a specific structure. The recommended basic structure is as follows:

```shell
model_repository/
└── <model-name>/
    ├── config.pbtxt
    ├── <output-labels-file>
    └── <version>/
        └── <model-definition-file>
```

-   `<model-name>`: The name of the model.
-   `config.pbtxt`: The model's configuration file. It defines input and output tensor information, batch size, platform, etc.
-   `<output-labels-file>`: For classification models, a text file containing class label information (optional).
-   `<version>`: The version number of the model (usually an integer). You can manage multiple versions.
-   `<model-definition-file>`: The actual model file (e.g., model.onnx, model.plan, model.pt, etc.).

**Example: Deploying a DenseNet ONNX Model**

Let's deploy a DenseNet model in ONNX format to Triton.

**1.1. Download Model and Create Repository**

Run the following shell command to create the model repository directory and download the ONNX DenseNet model file.

```shell
# Create model repository and version directory
mkdir -p model_repository/densenet_onnx/1

# Download ONNX DenseNet model
wget -O model_repository/densenet_onnx/1/model.onnx \
     https://github.com/onnx/models/raw/main/validated/vision/classification/densenet-121/model/densenet-7.onnx
```

**1.2. Create `config.pbtxt` Configuration File**

Create the `model_repository/densenet_onnx/config.pbtxt` file and add the following content.

```yaml
name: "densenet_onnx"        # Name of the model (recommended to match the directory name)
platform: "onnxruntime_onnx" # Model execution platform (using ONNX Runtime)
max_batch_size : 0          # Setting to 0 disables dynamic batching, assuming the model handles batching itself
                            # A value >0 enables dynamic batching up to that size
input [
  {
    name: "data_0"             # Name of the input tensor the model expects
    data_type: TYPE_FP32      # Input data type (FP32)
    format: FORMAT_NCHW       # Input data format (Batch, Channel, Height, Width)
    dims: [ 3, 224, 224 ]     # Dimensions of a single input (Channel, Height, Width)
    reshape { shape: [ 1, 3, 224, 224 ] } # Shape for internal server processing (including batch dimension)
                                       # This reshape may be ignored if max_batch_size > 0
  }
]
output [
  {
    name: "fc6_1"              # Name of the model's output tensor
    data_type: TYPE_FP32      # Output data type (FP32)
    dims: [ 1000 ]            # Dimensions of a single output (number of classes)
    reshape { shape: [ 1, 1000, 1, 1 ] } # Shape for internal server processing
    label_filename: "densenet_labels.txt" # Class label file name
  }
]
```

-   `max_batch_size`: Setting this to 0 disables Triton's dynamic batching feature, and the model uses the batch size it receives as input. If set to a value >0 (e.g., 8, 16), Triton will collect requests up to that batch size and process them at once. In this example, it is set to 0, assuming the model file (model.onnx) can already handle batch dimensions or will only process single requests. In a real operational scenario, it's important to adjust `max_batch_size` according to the model's characteristics and expected traffic.
-   `input.dims`: The dimensions of a single sample that the model actually expects. `[3, 224, 224]` represents channels (RGB), height, and width.
-   `input.reshape`: If `max_batch_size: 0` and the model can accept a dynamic batch size like `[-1, 3, 224, 224]`, when a client sends a single image, this reshape setting will convert it to `[1, 3, 224, 224]` internally before passing it to the model. If `max_batch_size` is greater than 0, this reshape setting is generally ignored, and the input shape is determined by the dynamic batching logic.

**1.3. Prepare `densenet_labels.txt` Label File**

A label file for the 1000 ImageNet classes is required. Create the `model_repository/densenet_onnx/densenet_labels.txt` file (link to official file: [https://github.com/triton-inference-server/server/blob/main/docs/examples/model_repository/densenet_onnx/densenet_labels.txt](https://github.com/triton-inference-server/server/blob/main/docs/examples/model_repository/densenet_onnx/densenet_labels.txt)) and enter the class name on each line. (The content is too long to include here. It is usually provided with the model or must be created manually. Examples: synset.txt, imagenet_classes.txt, etc.)

**2. Run Triton Server**

Now, run the Triton server as a Docker container using the prepared model repository.

```shell
docker run --rm --net=host -v ${PWD}/model_repository:/models nvcr.io/nvidia/tritonserver:25.02-py3 tritonserver --model-repository=/models --model-control-mode explicit --load-model densenet_onnx
```

-   `-v ${PWD}/model_repository:/models`: Mounts the `model_repository` directory from the host's current directory to the `/models` directory inside the container. The Triton server looks for models in this path.
-   `nvcr.io/nvidia/tritonserver:25.02-py3`: The Triton server Docker image to use. `25.02-py3` refers to the Python 3 version of the February 2025 release. (The version can be updated as needed).
-   `tritonserver`: The command to be executed inside the container.
-   `--model-repository=/models`: Specifies the path to the model repository inside the container.
-   `--model-control-mode explicit`: Instructs the server to load only the models specified with the `--load-model` option, instead of automatically loading all models at startup.
-   `--load-model densenet_onnx`: Specifies that the `densenet_onnx` model should be loaded.

When the server starts successfully, logs indicating that the model has been loaded and that the HTTP/gRPC services are ready will be displayed.

```shell
I0516 13:09:23.557992 1 grpc_server.cc:2558] "Started GRPCInferenceService at 0.0.0.0:8001"
I0516 13:09:23.558151 1 http_server.cc:4725] "Started HTTPService at 0.0.0.0:8000"
I0516 13:09:23.607014 1 http_server.cc:358] "Started Metrics Service at 0.0.0.0:8002"
```

> **Note**: The Triton Inference Server image is very large. Please be aware of this!

<img src="/img/2025-05-16/1.webp">

## 3. Run Triton Client (Image Classification Test)

Open another terminal and run the image classification client using the Triton SDK Docker image. This client sends a specified image to the server and retrieves the inference results.

```shell
# Send an inference request to the densenet_onnx model using the /workspace/images/mug.jpg image
docker run -it --rm --net=host nvcr.io/nvidia/tritonserver:25.02-py3-sdk /workspace/install/bin/image_client -m densenet_onnx -c 3 -s INCEPTION /workspace/images/mug.jpg
```

-   `nvcr.io/nvidia/tritonserver:25.02-py3-sdk`: The SDK image that includes Triton client libraries and example code.
-   `/workspace/install/bin/image_client`: The client program to execute.
-   `-m densenet_onnx`: The name of the model to request inference from.
-   `-c 3`: Output the top 3 prediction results.
-   `-s INCEPTION`: Specifies the image preprocessing method (Inception style: scales pixel values to the [-1, 1] range).
-   `/workspace/images/mug.jpg`: The path to the image to be used for testing. Example images are included in the SDK image.

**3.1. Testing with a Directly Downloaded Image**

You can also test with other images from your local machine or new images downloaded from the web.

First, enter the shell of the SDK container.

```shell
docker run -it --rm --net=host nvcr.io/nvidia/tritonserver:25.02-py3-sdk /bin/sh
```

Inside the container shell, run the following commands to download an image and test it with `image_client`.

```shell
# Download an image for testing (e.g., a new image)
wget -O img1.jpg "https://www.hakaimagazine.com/wp-content/uploads/header-gulf-birds.jpg"

# Run inference on the downloaded image
/workspace/install/bin/image_client -m densenet_onnx -c 3 -s INCEPTION ./img1.jpg
```

**Expected Output (for the new image example)**

The `image_client` prints the inference results in the format of class name, score (probability or logit value), and class index. For example, the expected output for the new image above might be (depending on the model and labels):

```shell
Image './img1.jpg':
    10.838984 (92) BEE EATER
    10.836040 (14) INDIGO FINCH
     8.926279 (88) MACAW
```

### Sending HTTP/REST Requests Using curl

In addition to gRPC, Triton provides an HTTP/REST interface. You can send inference requests directly using tools like `curl`. To do this, you need to create a JSON payload that matches the format expected by the model.

The following is an example Python script that preprocesses an image file and creates a JSON payload compliant with Triton's KServe V2 API standard.

**preprocess_and_create_payload.py**

```python
import json
from PIL import Image
import numpy as np
import argparse

# --- Model-specific parameters (modify according to config.pbtxt and model specifics) ---
MODEL_INPUT_NAME = "data_0"  # Must match the input name in config.pbtxt
MODEL_OUTPUT_NAME = "fc6_1" # Must match the output name in config.pbtxt

MODEL_EXPECTED_H = 224
MODEL_EXPECTED_W = 224
MODEL_EXPECTED_CHANNELS = 3
MODEL_DATATYPE = "FP32"  # Must match the input data_type in config.pbtxt (TYPE_FP32 -> FP32)

# Common ImageNet normalization values (should match the values used during model training)
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)
# --- End of model-specific parameters ---

def preprocess_image(image_path):
    """
    Loads and preprocesses an image to match the model's input requirements.
    Matches config.pbtxt's input format: FORMAT_NCHW, dims: [3, 224, 224].
    """
    try:
        img = Image.open(image_path).convert("RGB")
    except FileNotFoundError:
        print(f"Error: Image file not found at {image_path}")
        return None, None

    # Resize to model input size
    img_resized = img.resize((MODEL_EXPECTED_W, MODEL_EXPECTED_H))
    # Convert to Numpy array and scale to 0-1
    img_np = np.array(img_resized, dtype=np.float32) / 255.0
    # Normalize
    img_np = (img_np - MEAN) / STD
    # Change to NCHW format (Channel, Height, Width)
    # Current img_np shape: (MODEL_EXPECTED_H, MODEL_EXPECTED_W, MODEL_EXPECTED_CHANNELS)
    # Target img_np_chw shape: (MODEL_EXPECTED_CHANNELS, MODEL_EXPECTED_H, MODEL_EXPECTED_W)
    img_np_chw = img_np.transpose((2, 0, 1))

    # The input dims in config.pbtxt is [3, 224, 224], with no batch dimension.
    # Therefore, the payload's shape must also be [3, 224, 224].
    # We flatten it into a 1D list.
    return img_np_chw.flatten().tolist(), list(img_np_chw.shape)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("image_file_path", help="Path to the image file for preprocessing.")
    parser.add_argument(
        "--payload_file",
        type=str,
        default="payload.json",
        help="Filename for the output JSON payload.",
    )
    args = parser.parse_args()

    preprocessed_data_list, actual_shape_for_payload = preprocess_image(args.image_file_path)

    if preprocessed_data_list is None:
        exit(1)

    # Construct the request payload according to the KServe V2 API standard
    triton_request_payload = {
        "inputs": [
            {
                "name": MODEL_INPUT_NAME,
                "shape": actual_shape_for_payload,  # e.g., [3, 224, 224]
                "datatype": MODEL_DATATYPE,
                "data": preprocessed_data_list,     # Flattened 1D data
            }
        ],
        "outputs": [{"name": MODEL_OUTPUT_NAME}], # Specify the requested output tensor
    }

    with open(args.payload_file, "w") as f:
        json.dump(triton_request_payload, f)

    print(f"Preprocessed data and created JSON payload: {args.payload_file}")
    print(f"Input tensor name for the request: {MODEL_INPUT_NAME}")
    print(f"Input tensor shape for the request (in {args.payload_file}): {actual_shape_for_payload}")
    print(f"Output tensor name requested: {MODEL_OUTPUT_NAME}")
```

**Script Execution and curl Request**

1.  Save the Python script above as `preprocess_and_create_payload.py`.
2.  Prepare an image for testing (e.g., `img1.jpg`) - use the image downloaded in step 3.1.
3.  Run the Python script to generate the `payload.json` file. The execution will create `payload.json` and print the input tensor name and shape information.
    
    ```shell
    # (Install Pillow, numpy if necessary):
    pip install Pillow numpy
    python preprocess_and_create_payload.py img1.jpg
    ```
    
4.  Use the generated `payload.json` file to send an inference request to the Triton server with `curl`. (Assuming the Triton server is running at `localhost:8000`)
    -   `http://localhost:8000/v2/models/densenet_onnx/infer`: The KServe V2 inference API endpoint for Triton. `densenet_onnx` is the model name.
    -   `-d @payload.json`: Uses the content of the `payload.json` file as the request body.
        
        ```shell
        curl -X POST \
             -H "Content-Type: application/json" \
             http://localhost:8000/v2/models/densenet_onnx/infer \
             -d @payload.json
        ```
        
The Triton server will receive this request, perform inference, and return the results in JSON format.

### Considerations and Additional Information

Here are a few things to consider when operating Triton Inference Server.

-   **Triton Docker Image Size**: Triton Docker images can be quite large because they support various frameworks and features (e.g., `nvcr.io/nvidia/tritonserver:25.02-py3` can be several GB). This provides the flexibility to serve various models in a single server without separate environment configurations, but it means that disk space and network bandwidth must be considered during initial download and deployment. It is also possible to build a custom image containing only the necessary backends (frameworks) to reduce the size.
-   **Resource Management and Optimization**: When hosting multiple models on a single Triton instance or serving a single high-traffic model, GPU/CPU resources, memory usage, etc., must be carefully monitored and optimized.
    -   The number of GPU or CPU instances per model can be adjusted through the `instance_group` setting in `config.pbtxt`.
    -   The balance between latency and throughput can be adjusted through the `dynamic_batching` setting.
    -   The **Model Analyzer** provided by NVIDIA can help find the optimal batch size and instance configuration for each model.
-   **Multi-Node Operation in a Kubernetes Environment**: For large-scale service environments, Triton servers can be distributed across multiple nodes to increase scalability and availability. Orchestration tools like Kubernetes make it easier to manage such multi-node deployments, load balancing, and auto-scaling.
    -   NVIDIA provides tutorials for deploying large language models like Triton and TensorRT-LLM across multiple nodes in environments like EKS (Amazon Elastic Kubernetes Service). You can find more details at the following links:
        -   [EKS Multinode Triton TRTLLM Tutorial (NVIDIA Docs)](https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/tutorials/Deployment/Kubernetes/EKS_Multinode_Triton_TRTLLM/README.html)
        -   [Triton Tutorials - Kubernetes Deployment (GitHub)](https://github.com/triton-inference-server/tutorials/tree/main/Deployment/Kubernetes/EKS_Multinode_Triton_TRTLLM)
    -   This approach involves each Triton Pod serving models independently, while Kubernetes' service discovery and load balancing features expand the overall processing capacity.

### Conclusion

NVIDIA Triton Inference Server is a powerful and flexible solution for efficiently deploying and managing various AI models in a production environment. With its broad framework support, high performance, concurrent model execution, and cloud-native architecture support, it offers convenience for both developers and operators.

Based on the content introduced in this article, I encourage you to get started with Triton and explore more features and advanced usage through the official documentation and tutorials. Triton will be a reliable companion on your journey to successful AI model deployment.

