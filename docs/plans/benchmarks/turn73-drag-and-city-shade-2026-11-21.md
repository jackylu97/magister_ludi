# Drag input and city shading on turn 73

The earlier drag measurement included idle animation draws. A player can wait for a pointer event to reach the page, for the game to accept the pan, and for the renderer to submit a frame with the new camera. A gap between two submissions can include all three. It can also include time when the camera stayed still.

## Input

In the three slower full-board recordings, 24 gaps lasted at least 40 ms. The camera stayed at the same position in 20 of them. The other four started drawing within 0.6 ms of an accepted pan and submitted within 9.7 ms. The board draws idle motion at 24 FPS, about 41.7 ms apart. In the two slowest drags, browser pointer-event timestamps had gaps of up to 250 and 265 ms. Those captures did not record when the test driver sent each event.

A separate private headless Chrome session repeated six drags on the Apple M4. The five-city view had Explorer, resources and yields on at 1.5×. Bot planning was off. Each drag scheduled 114 mouse events over 1.9 seconds. The driver recorded its actual send times and passed those timestamps to Chrome. The probe recorded accepted pans and the next frame that included them. Three control drags skipped the final board draw. These figures end at CPU submission.

| 95th percentile across the three runs of each kind | Full board | Board draw skipped |
|---|---:|---:|
| Driver lateness sending an event | 1.4–4.2 ms | 1.1–1.3 ms |
| Time from send until the page received the event | 6.2–7.6 ms | 1.2–1.9 ms |
| Time from accepting a pan to starting its next draw | 0.6–0.8 ms | 0.4–0.6 ms |
| Time from accepting a pan to submitting its next frame | 7.1–8.5 ms | 0.9–1.3 ms |
| Gap between all board submissions | 19.0–21.9 ms | 17.5–18.0 ms |

Of the 71 pointer events queued for at least 5 ms in the earlier full-board runs, 71% of their total queued time overlapped the previous board frame on the main thread. In the fresh runs the share was 50% across 35 events. A previous draw can delay a new input event even if the pan handler itself is quick. The fresh test did not reproduce the earlier 40 ms submission gaps. It does not establish hardware input or monitor latency.

## City shading

At normal zoom with the city screen closed, compare two warm shader programs. A uses the current shader with its shade and rim uniforms at zero. B removes only the city shading block. Compare the same camera position, meshes, drawing buffer and clock with alternating order and measure the whole frame with the WebGL GPU timer. Both variants used the same draw and triangle counts. Three pixel comparisons matched all 10,486,980 colour bytes in each image.

Removing the disabled block saved a median of 0.22 ms over 30 pairs and was faster in 24. Ten same-shader pairs had a median difference of −0.03 ms, with five faster. This is a small cost in this view. The measurement does not justify compiling another set of shaders when the player opens a city. The current runtime stays in place.

[Per-run input timings and paired GPU measurements](turn73-drag-and-city-shade-2026-11-21.json)
