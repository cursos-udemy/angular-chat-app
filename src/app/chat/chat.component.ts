import { Component, OnInit } from '@angular/core';
import { Client } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';
import { Message } from './models/message';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit {

  private client: Client;
  public connected: boolean = false;
  public message: Message;
  public messages: Message[] = [];
  public userWriting: string = '';
  private clientId: string;

  constructor() {
    this.clientId = uuidv4();
   }

  ngOnInit(): void {
    this.client = new Client();
    this.message = new Message();
    this.client.webSocketFactory = () => new SockJS('http://localhost:8080/chat-websocket');

    this.client.onConnect = (frame) => {
      console.log(`Connected to chat-service: ${this.client.connected}, data: ${frame}`);
      this.connected = this.client.connected;

      this.client.subscribe('/chat/malbec-runners', (event) => {
        let msg = JSON.parse(event.body) as Message;
        console.log('receive: ', msg);
        //msg.time = new Date(msg.time);
        if (!this.message.color && msg.type == 'LOGIN' && msg.username == this.message.username) {
          this.message.color = msg.color;
        }
        this.messages.push(msg);
      });

      this.client.subscribe('/chat/malbec-runners-writing', (event) => {
        this.userWriting = event.body;
        setTimeout(() => this.userWriting = '', 3000);
      });

      this.client.subscribe(`/chat/malbec-runners-history/${this.clientId}`, (event) => {
        this.messages = (JSON.parse(event.body) as Message[]).reverse();
      });

      this.message.type = 'LOGIN';
      this.client.publish({
        destination: '/app/message',
        body: JSON.stringify(this.message)
      });

      this.client.publish({
        destination: '/app/malbec-runners-history',
        body: this.clientId
      });

    };

    this.client.onDisconnect = (frame) => {
      console.log(`Disconnected to chat-service: ${this.client.connected}, data: ${frame}`);
      this.connected = this.client.connected;
      this.message = new Message();
      this.messages = [];
    }
  }

  public connect(): void {
    this.client.activate();
  }

  public disconnect(): void {
    this.client.deactivate();
  }

  public sendMessage(): void {
    this.message.type = 'MESSAGE';
    this.client.publish({
      destination: '/app/message',
      body: JSON.stringify(this.message)
    });
    this.message.text = '';
  }

  public writingEvent(): void {
    this.client.publish({
      destination: '/app/writing',
      body: this.message.username
    });
  }



}
