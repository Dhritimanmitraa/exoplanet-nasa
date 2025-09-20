"""
Batch-generate short AI videos for planets using Stable Diffusion (Diffusers) locally.

IMPORTANT:
- This script does NOT run in this environment here. It is a recipe you run on your machine with a GPU.
- You MUST have a capable GPU with sufficient VRAM (ideally >= 12GB) and a working PyTorch + CUDA installation.
- You MUST install the model weights and have a Hugging Face token with access to the model you choose.

Overview:
- For each planet name in `public/data/planets.min.json` this script creates N frames by sampling the text-to-image pipeline with small prompt variations and different seeds.
- It then calls `ffmpeg` to combine frames into an MP4 in `public/images/<planet-basename>.mp4`.

Dependencies (examples):
  pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
  pip install diffusers[torch] transformers accelerate safetensors pillow numpy

Environment:
- Set your Hugging Face token: `export HUGGINGFACE_TOKEN=...` (Linux/macOS) or in Windows PowerShell:
  $env:HUGGINGFACE_TOKEN = "<token>"

Models and licensing:
- Use a model you have rights to run locally - e.g., "runwayml/stable-diffusion-v1-5" (or other) from Hugging Face.
- This script uses a text-to-image pipeline; for higher temporal coherence you'd use dedicated video/temporal models or img2img chains.

Notes:
- This is a best-effort local generator. True cinematic videos require temporal-aware models and tuning.

Usage (PowerShell):
  python .\scripts\generate_ai_videos.py --data public/data/planets.min.json --outdir public/images --frames 20 --width 1024 --height 576

"""

import os
import json
import argparse
import subprocess
from pathlib import Path
from tqdm import tqdm
import numpy as np

# Diffusers imports - optional if user doesn't have package installed
try:
    from diffusers import StableDiffusionPipeline
    import torch
except Exception as e:
    StableDiffusionPipeline = None


def load_planets(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def ensure_ffmpeg():
    try:
        subprocess.run(['ffmpeg', '-version'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    except Exception:
        raise RuntimeError('ffmpeg not found in PATH. Install ffmpeg and ensure it is available.')


def make_frames_for_prompt(pipeline, prompt, out_dir: Path, num_frames: int, width: int, height: int, device, seeds=None):
    out_dir.mkdir(parents=True, exist_ok=True)
    if seeds is None:
        # choose deterministic seeds
        seeds = [int(1000 + i * 7) for i in range(num_frames)]

    # Slight prompt variations to encourage small changes between frames
    # For more coherent results you'd use img2img + motion flow or temporal models.
    for i, s in enumerate(seeds):
        frame_prompt = prompt + f", cinematic, ultra-detailed, wide shot, subtle camera movement, frame {i+1}"
        generator = torch.Generator(device=device).manual_seed(s)
        image = pipeline(frame_prompt, width=width, height=height, num_inference_steps=20, generator=generator).images[0]
        frame_path = out_dir / f"frame_{i:04d}.png"
        image.save(frame_path)
    return out_dir


def assemble_video(frames_dir: Path, out_path: Path, fps: int = 12):
    # frames named frame_0000.png ...
    cmd = [
        'ffmpeg', '-y', '-framerate', str(fps), '-i', str(frames_dir / 'frame_%04d.png'),
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(out_path)
    ]
    subprocess.run(cmd, check=True)


def generate_videos(args):
    if StableDiffusionPipeline is None:
        raise RuntimeError('diffusers/torch not installed. Install dependencies first (see top of script).')

    hf_token = os.environ.get('HUGGINGFACE_TOKEN') or os.environ.get('HF_TOKEN')
    if not hf_token:
        raise RuntimeError('HUGGINGFACE_TOKEN env var is required to download models from Hugging Face.')

    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    print('Device:', device)
    model_id = args.model

    print('Loading model (this can take time and VRAM)...')
    pipe = StableDiffusionPipeline.from_pretrained(model_id, torch_dtype=torch.float16, use_safetensors=True)
    pipe = pipe.to(device)

    planets = load_planets(args.data)
    ensure_ffmpeg()

    out_base = Path(args.outdir)
    working = Path('.cache_video_frames')
    working.mkdir(parents=True, exist_ok=True)

    for planet in tqdm(planets):
        name = planet.get('pl_name') or planet.get('name') or 'planet'
        safe_name = ''.join(c for c in name if c.isalnum() or c in (' ', '-', '_')).strip().replace(' ', '_')
        prompt = f"A cinematic, highly detailed landscape of the exoplanet named {name}. Alien terrain, dramatic sky, vibrant colors, photorealistic"

        frames_dir = working / safe_name
        # remove existing frames
        if frames_dir.exists():
            for f in frames_dir.iterdir():
                f.unlink()
        frames_dir.mkdir(parents=True, exist_ok=True)

        print(f'Generating frames for {name} -> {frames_dir} (this may take many minutes per planet)')
        try:
            make_frames_for_prompt(pipe, prompt, frames_dir, args.frames, args.width, args.height, device)
        except Exception as e:
            print('Frame generation failed for', name, str(e))
            continue

        out_mp4 = out_base / f"{safe_name}.mp4"
        print('Assembling video to', out_mp4)
        try:
            assemble_video(frames_dir, out_mp4, fps=args.fps)
            print('Saved video', out_mp4)
        except Exception as e:
            print('ffmpeg assemble failed for', name, str(e))

    print('All done. Generated videos placed in', out_base)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', default='public/data/planets.min.json', help='path to planets json')
    parser.add_argument('--outdir', default='public/images', help='where to write planet mp4s')
    parser.add_argument('--frames', type=int, default=20, help='frames per video')
    parser.add_argument('--fps', type=int, default=12)
    parser.add_argument('--width', type=int, default=1024)
    parser.add_argument('--height', type=int, default=576)
    parser.add_argument('--model', default='runwayml/stable-diffusion-v1-5', help='Hugging Face model id')
    parser.add_argument('--limit', type=int, default=0, help='limit number of planets to process (0 = all)')
    args = parser.parse_args()

    generate_videos(args)