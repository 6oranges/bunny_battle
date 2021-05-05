import pygame
pygame.init()
for i in range(26):
    img=pygame.image.load("frame"+"0"*(2-len(str(i)))+str(i)+".png")
    width,height=img.get_size()
    pygame.image.save(pygame.transform.scale(img,(int(width/2),int(height/2))),"frame"+"0"*(2-len(str(i)))+str(i)+".png")
